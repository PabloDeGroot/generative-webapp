import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { toolkitCollection, userCollection } from "../shared/state";

// A multi-user discussion board kept entirely in Firestore (no external API):
//   toolkits/community/posts/{postId}                      posts
//   toolkits/community/posts/{postId}/comments/{commentId}  threaded comments (parentId + depth)
//   .../votes/{userId}                                      one vote per user per post/comment
//   toolkits/community/profiles/{userId}                    display name, bio, counters, karma
//   toolkits/community/users/{userId}/notifications/{id}    replies to the user's posts/comments
// Lists, sorting and search work in memory over the most recent posts, so no composite indexes
// are needed; that is fine for a demo-sized board.

export const BOARDS = [
    { id: "general", name: "General", description: "Anything that doesn't fit elsewhere." },
    { id: "show-and-tell", name: "Show and tell", description: "Share something you made." },
    { id: "questions", name: "Questions", description: "Ask the community for help." },
    { id: "ideas", name: "Ideas", description: "Suggestions and feature requests." },
    { id: "off-topic", name: "Off-topic", description: "Everything else." }
] as const;
export const BOARD_IDS = BOARDS.map((b) => b.id) as [string, ...string[]];

export const LIMITS = {
    title: 200,
    body: 10_000,
    comment: 5_000,
    tags: 5,
    bio: 500,
    displayName: 40,
    maxDepth: 6,
    postsPerHour: 5,
    commentsPerHour: 30,
    recentPosts: 500,
    commentsPerPost: 500
};

const HOUR_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Text safety
// ---------------------------------------------------------------------------

/**
 * User text is stored HTML-escaped. Pages are LLM-generated HTML inserted with {@html}, so raw
 * user input could otherwise become stored XSS for every reader.
 */
export function escapeText(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function cleanText(text: string, max: number, field: string): string {
    const trimmed = text.trim();
    if (!trimmed) throw new Error(`${field} can't be empty.`);
    if (trimmed.length > max) throw new Error(`${field} is limited to ${max} characters.`);
    return escapeText(trimmed);
}

function cleanTags(tags: string[] | undefined): string[] {
    const cleaned = (tags ?? [])
        .map((t) => t.toLowerCase().trim().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, ""))
        .filter(Boolean);
    return [...new Set(cleaned)].slice(0, LIMITS.tags);
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

interface ProfileDoc {
    displayName: string;
    photoURL: string | null;
    bio: string;
    createdAt: number;
    postCount: number;
    commentCount: number;
    karma: number;
    rateWindowStart: number;
    postsInWindow: number;
    commentsInWindow: number;
}

const posts = () => toolkitCollection("posts");
const profiles = () => toolkitCollection("profiles");
const notifications = (userId: string) => userCollection(userId, "notifications");

async function newProfile(userId: string): Promise<ProfileDoc> {
    // First activity: take the name and photo from the user's (Google) account.
    let displayName = `user-${userId.slice(0, 6)}`;
    let photoURL: string | null = null;
    try {
        const user = await getAuth().getUser(userId);
        if (user.displayName) displayName = escapeText(user.displayName.slice(0, LIMITS.displayName));
        photoURL = user.photoURL ?? null;
    } catch {
        // Unknown in Auth (e.g. emulator placeholder user): keep the generated name.
    }
    return {
        displayName, photoURL, bio: "", createdAt: Date.now(), postCount: 0, commentCount: 0, karma: 0,
        rateWindowStart: Date.now(), postsInWindow: 0, commentsInWindow: 0
    };
}

/**
 * Inside a transaction: loads (or creates) the author's profile, enforces the hourly rate limit
 * for `kind`, and bumps the counters. Must run before any transaction writes.
 */
async function chargeAuthor(tx: Transaction, userId: string, kind: "post" | "comment", fresh: ProfileDoc): Promise<ProfileDoc> {
    const ref = profiles().doc(userId);
    const snap = await tx.get(ref);
    const profile = snap.exists ? (snap.data() as ProfileDoc) : fresh;
    const now = Date.now();
    if (now - profile.rateWindowStart >= HOUR_MS) {
        profile.rateWindowStart = now;
        profile.postsInWindow = 0;
        profile.commentsInWindow = 0;
    }
    if (kind === "post") {
        if (profile.postsInWindow >= LIMITS.postsPerHour) throw new Error(`You can create at most ${LIMITS.postsPerHour} posts per hour.`);
        profile.postsInWindow += 1;
        profile.postCount += 1;
    } else {
        if (profile.commentsInWindow >= LIMITS.commentsPerHour) throw new Error(`You can post at most ${LIMITS.commentsPerHour} comments per hour.`);
        profile.commentsInWindow += 1;
        profile.commentCount += 1;
    }
    return profile;
}

type Author = { userId: string; displayName: string; photoURL: string | null };

/** Current display names/photos for a set of users (names are resolved at read time, not copied). */
async function loadAuthors(userIds: string[]): Promise<Map<string, Author>> {
    const unique = [...new Set(userIds)];
    const result = new Map<string, Author>();
    if (!unique.length) return result;
    const snaps = await getFirestore().getAll(...unique.map((id) => profiles().doc(id)));
    for (const snap of snaps) {
        const p = snap.data() as ProfileDoc | undefined;
        result.set(snap.id, { userId: snap.id, displayName: p?.displayName ?? `user-${snap.id.slice(0, 6)}`, photoURL: p?.photoURL ?? null });
    }
    return result;
}

export async function getProfile(userId: string) {
    const snap = await profiles().doc(userId).get();
    if (!snap.exists) throw new Error(`No community profile for user '${userId}' (they haven't posted yet).`);
    const p = snap.data() as ProfileDoc;
    const recent = (await recentPosts()).filter((post) => post.authorId === userId).slice(0, 10);
    return {
        userId,
        displayName: p.displayName,
        photoURL: p.photoURL,
        bio: p.bio,
        memberSince: new Date(p.createdAt).toISOString(),
        postCount: p.postCount,
        commentCount: p.commentCount,
        karma: p.karma,
        recentPosts: recent.map((post) => summarize(post, new Map([[userId, { userId, displayName: p.displayName, photoURL: p.photoURL }]])))
    };
}

export async function updateProfile(userId: string, changes: { displayName?: string; bio?: string }) {
    const fresh = await newProfile(userId);
    const ref = profiles().doc(userId);
    await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const profile = snap.exists ? (snap.data() as ProfileDoc) : fresh;
        if (changes.displayName !== undefined) profile.displayName = cleanText(changes.displayName, LIMITS.displayName, "Display name");
        if (changes.bio !== undefined) profile.bio = changes.bio.trim() ? cleanText(changes.bio, LIMITS.bio, "Bio") : "";
        tx.set(ref, profile);
    });
    return getProfile(userId);
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

interface PostDoc {
    boardId: string;
    title: string;
    body: string;
    tags: string[];
    authorId: string;
    createdAt: number;
    editedAt: number | null;
    lastActivityAt: number;
    score: number;
    upvotes: number;
    downvotes: number;
    commentCount: number;
    deleted: boolean;
}

type PostRecord = PostDoc & { id: string };

async function recentPosts(): Promise<PostRecord[]> {
    const snap = await posts().orderBy("createdAt", "desc").limit(LIMITS.recentPosts).get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as PostDoc) })).filter((p) => !p.deleted);
}

function hotness(post: PostDoc, now: number): number {
    const ageHours = (now - post.createdAt) / HOUR_MS;
    return (post.score + post.commentCount * 0.5 + 1) / Math.pow(ageHours + 2, 1.5);
}

function summarize(post: PostRecord, authors: Map<string, Author>, myVote?: number) {
    return {
        id: post.id,
        boardId: post.boardId,
        title: post.title,
        excerpt: post.body.length > 280 ? `${post.body.slice(0, 280)}…` : post.body,
        tags: post.tags,
        author: authors.get(post.authorId) ?? { userId: post.authorId, displayName: "unknown", photoURL: null },
        createdAt: new Date(post.createdAt).toISOString(),
        lastActivityAt: new Date(post.lastActivityAt).toISOString(),
        score: post.score,
        commentCount: post.commentCount,
        ...(myVote !== undefined && { myVote })
    };
}

async function myVotes(refs: DocumentReference[], userId: string | null): Promise<number[]> {
    if (!userId || !refs.length) return refs.map(() => 0);
    const snaps = await getFirestore().getAll(...refs.map((r) => r.collection("votes").doc(userId)));
    return snaps.map((s) => (s.data()?.value as number | undefined) ?? 0);
}

export function listBoards() {
    return recentPosts().then((all) => BOARDS.map((b) => {
        const inBoard = all.filter((p) => p.boardId === b.id);
        return {
            ...b,
            postCount: inBoard.length,
            lastActivityAt: inBoard.length ? new Date(Math.max(...inBoard.map((p) => p.lastActivityAt))).toISOString() : null
        };
    }));
}

export async function listPosts(userId: string | null, options: {
    board?: string; sort?: "hot" | "new" | "top" | "active"; tag?: string; authorId?: string; limit?: number; offset?: number;
}) {
    const { board, sort = "hot", tag, authorId, limit = 20, offset = 0 } = options;
    const now = Date.now();
    let list = await recentPosts();
    if (board) list = list.filter((p) => p.boardId === board);
    if (tag) list = list.filter((p) => p.tags.includes(tag.toLowerCase()));
    if (authorId) list = list.filter((p) => p.authorId === authorId);
    const sorters = {
        hot: (a: PostRecord, b: PostRecord) => hotness(b, now) - hotness(a, now),
        new: (a: PostRecord, b: PostRecord) => b.createdAt - a.createdAt,
        top: (a: PostRecord, b: PostRecord) => b.score - a.score || b.createdAt - a.createdAt,
        active: (a: PostRecord, b: PostRecord) => b.lastActivityAt - a.lastActivityAt
    };
    list.sort(sorters[sort]);
    const page = list.slice(offset, offset + limit);
    const [authors, votes] = await Promise.all([
        loadAuthors(page.map((p) => p.authorId)),
        myVotes(page.map((p) => posts().doc(p.id)), userId)
    ]);
    return {
        board: board ? BOARDS.find((b) => b.id === board) ?? null : null,
        sort,
        total: list.length,
        offset,
        posts: page.map((p, i) => summarize(p, authors, userId ? votes[i] : undefined))
    };
}

export async function searchPosts(query: string, limit = 20) {
    const q = escapeText(query.trim().toLowerCase());
    const matches = (await recentPosts()).filter((p) =>
        p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q))
    ).slice(0, limit);
    const authors = await loadAuthors(matches.map((p) => p.authorId));
    return { query, results: matches.map((p) => summarize(p, authors)) };
}

export async function createPost(userId: string, input: { board: string; title: string; body: string; tags?: string[] }) {
    if (!BOARD_IDS.includes(input.board)) throw new Error(`Unknown board '${input.board}'. Boards: ${BOARD_IDS.join(", ")}.`);
    const fresh = await newProfile(userId);
    const now = Date.now();
    const post: PostDoc = {
        boardId: input.board,
        title: cleanText(input.title, LIMITS.title, "Title"),
        body: cleanText(input.body, LIMITS.body, "Body"),
        tags: cleanTags(input.tags),
        authorId: userId,
        createdAt: now,
        editedAt: null,
        lastActivityAt: now,
        score: 0, upvotes: 0, downvotes: 0, commentCount: 0,
        deleted: false
    };
    const ref = posts().doc();
    await getFirestore().runTransaction(async (tx) => {
        const profile = await chargeAuthor(tx, userId, "post", fresh);
        tx.set(profiles().doc(userId), profile);
        tx.set(ref, post);
    });
    return { id: ref.id, ...post };
}

async function loadOwnPost(userId: string, postId: string): Promise<{ ref: DocumentReference; post: PostDoc }> {
    const ref = posts().doc(postId);
    const snap = await ref.get();
    const post = snap.data() as PostDoc | undefined;
    if (!post || post.deleted) throw new Error(`Post '${postId}' not found.`);
    if (post.authorId !== userId) throw new Error("Only the author can change this post.");
    return { ref, post };
}

export async function editPost(userId: string, postId: string, changes: { title?: string; body?: string; tags?: string[] }) {
    const { ref } = await loadOwnPost(userId, postId);
    const update: Partial<PostDoc> = { editedAt: Date.now() };
    if (changes.title !== undefined) update.title = cleanText(changes.title, LIMITS.title, "Title");
    if (changes.body !== undefined) update.body = cleanText(changes.body, LIMITS.body, "Body");
    if (changes.tags !== undefined) update.tags = cleanTags(changes.tags);
    await ref.update(update);
    return { id: postId, ...((await ref.get()).data() as PostDoc) };
}

export async function deletePost(userId: string, postId: string) {
    const { ref } = await loadOwnPost(userId, postId);
    // Soft delete: the discussion underneath stays readable.
    await ref.update({ deleted: true, title: "[deleted]", body: "", tags: [], editedAt: Date.now() });
    return { deleted: postId };
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

interface CommentDoc {
    parentId: string | null;
    depth: number;
    body: string;
    authorId: string;
    createdAt: number;
    editedAt: number | null;
    score: number;
    upvotes: number;
    downvotes: number;
    deleted: boolean;
}

interface CommentNode {
    id: string;
    parentId: string | null;
    depth: number;
    body: string;
    author: Author;
    createdAt: string;
    edited: boolean;
    score: number;
    deleted: boolean;
    myVote?: number;
    replies: CommentNode[];
}

export async function getPost(userId: string | null, postId: string) {
    const ref = posts().doc(postId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Post '${postId}' not found.`);
    const post = { id: snap.id, ...(snap.data() as PostDoc) };
    const commentSnap = await ref.collection("comments").orderBy("createdAt").limit(LIMITS.commentsPerPost).get();
    const comments = commentSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...(d.data() as CommentDoc) }));

    const [authors, [postVote], commentVotes] = await Promise.all([
        loadAuthors([post.authorId, ...comments.map((c) => c.authorId)]),
        myVotes([ref], userId),
        myVotes(comments.map((c) => c.ref), userId)
    ]);

    const nodes = new Map<string, CommentNode>();
    comments.forEach((c, i) => nodes.set(c.id, {
        id: c.id,
        parentId: c.parentId,
        depth: c.depth,
        body: c.deleted ? "[deleted]" : c.body,
        author: c.deleted ? { userId: "", displayName: "[deleted]", photoURL: null } : authors.get(c.authorId)!,
        createdAt: new Date(c.createdAt).toISOString(),
        edited: c.editedAt !== null,
        score: c.score,
        deleted: c.deleted,
        ...(userId && { myVote: commentVotes[i] }),
        replies: []
    }));
    const roots: CommentNode[] = [];
    for (const node of nodes.values()) {
        const parent = node.parentId ? nodes.get(node.parentId) : undefined;
        (parent ? parent.replies : roots).push(node);
    }
    const sortThread = (list: CommentNode[]) => {
        list.sort((a, b) => b.score - a.score || a.createdAt.localeCompare(b.createdAt));
        list.forEach((n) => sortThread(n.replies));
    };
    sortThread(roots);

    return {
        post: {
            ...summarize(post, authors, userId ? postVote : undefined),
            body: post.body,
            edited: post.editedAt !== null,
            deleted: post.deleted,
            board: BOARDS.find((b) => b.id === post.boardId) ?? null
        },
        comments: roots
    };
}

export async function addComment(userId: string, input: { postId: string; body: string; parentCommentId?: string }) {
    const postRef = posts().doc(input.postId);
    const body = cleanText(input.body, LIMITS.comment, "Comment");
    const fresh = await newProfile(userId);
    const commentRef = postRef.collection("comments").doc();
    const now = Date.now();

    const { post, parent } = await getFirestore().runTransaction(async (tx) => {
        // All reads first (Firestore transactions require reads before writes).
        const postSnap = await tx.get(postRef);
        const post = postSnap.data() as PostDoc | undefined;
        if (!post || post.deleted) throw new Error(`Post '${input.postId}' not found.`);
        let parent: CommentDoc | undefined;
        if (input.parentCommentId) {
            const parentSnap = await tx.get(postRef.collection("comments").doc(input.parentCommentId));
            parent = parentSnap.data() as CommentDoc | undefined;
            if (!parent) throw new Error(`Comment '${input.parentCommentId}' not found on this post.`);
            if (parent.depth + 1 > LIMITS.maxDepth) throw new Error(`Threads are limited to ${LIMITS.maxDepth} levels; reply higher up.`);
        }
        const profile = await chargeAuthor(tx, userId, "comment", fresh);

        tx.set(profiles().doc(userId), profile);
        tx.set(commentRef, {
            parentId: input.parentCommentId ?? null,
            depth: parent ? parent.depth + 1 : 0,
            body, authorId: userId, createdAt: now, editedAt: null,
            score: 0, upvotes: 0, downvotes: 0, deleted: false
        } satisfies CommentDoc);
        tx.update(postRef, { commentCount: FieldValue.increment(1), lastActivityAt: now });
        return { post, parent };
    });

    // Notify whoever was replied to (not yourself). Best-effort, outside the transaction.
    const recipient = parent ? parent.authorId : post.authorId;
    if (recipient && recipient !== userId) {
        const [author] = (await loadAuthors([userId])).values();
        await notifications(recipient).add({
            type: parent ? "comment-reply" : "post-reply",
            postId: input.postId,
            postTitle: post.title,
            commentId: commentRef.id,
            fromUserId: userId,
            fromName: author?.displayName ?? "someone",
            excerpt: body.length > 160 ? `${body.slice(0, 160)}…` : body,
            createdAt: now,
            read: false
        }).catch(() => undefined);
    }
    return { id: commentRef.id, postId: input.postId, parentId: input.parentCommentId ?? null, body, createdAt: new Date(now).toISOString() };
}

async function loadOwnComment(userId: string, postId: string, commentId: string) {
    const ref = posts().doc(postId).collection("comments").doc(commentId);
    const comment = (await ref.get()).data() as CommentDoc | undefined;
    if (!comment || comment.deleted) throw new Error(`Comment '${commentId}' not found.`);
    if (comment.authorId !== userId) throw new Error("Only the author can change this comment.");
    return ref;
}

export async function editComment(userId: string, postId: string, commentId: string, body: string) {
    const ref = await loadOwnComment(userId, postId, commentId);
    const cleaned = cleanText(body, LIMITS.comment, "Comment");
    await ref.update({ body: cleaned, editedAt: Date.now() });
    return { id: commentId, body: cleaned };
}

export async function deleteComment(userId: string, postId: string, commentId: string) {
    const ref = await loadOwnComment(userId, postId, commentId);
    // Soft delete keeps replies attached to the thread.
    await ref.update({ deleted: true, body: "", editedAt: Date.now() });
    return { deleted: commentId };
}

// ---------------------------------------------------------------------------
// Votes
// ---------------------------------------------------------------------------

/** Sets the user's vote (1 up, -1 down, 0 clear) on a post or comment; updates score and the author's karma. */
export async function vote(userId: string, input: { postId: string; commentId?: string; value: -1 | 0 | 1 }) {
    const postRef = posts().doc(input.postId);
    const targetRef = input.commentId ? postRef.collection("comments").doc(input.commentId) : postRef;
    const voteRef = targetRef.collection("votes").doc(userId);

    return getFirestore().runTransaction(async (tx) => {
        const [targetSnap, voteSnap] = await Promise.all([tx.get(targetRef), tx.get(voteRef)]);
        const target = targetSnap.data() as (PostDoc | CommentDoc) | undefined;
        if (!target || target.deleted) throw new Error(input.commentId ? "Comment not found." : "Post not found.");
        if (target.authorId === userId) throw new Error("You can't vote on your own content.");
        const previous = (voteSnap.data()?.value as number | undefined) ?? 0;
        const delta = input.value - previous;
        if (delta !== 0) {
            tx.update(targetRef, {
                score: FieldValue.increment(delta),
                upvotes: FieldValue.increment((input.value === 1 ? 1 : 0) - (previous === 1 ? 1 : 0)),
                downvotes: FieldValue.increment((input.value === -1 ? 1 : 0) - (previous === -1 ? 1 : 0))
            });
            tx.set(profiles().doc(target.authorId), { karma: FieldValue.increment(delta) }, { merge: true });
            if (input.value === 0) tx.delete(voteRef);
            else tx.set(voteRef, { value: input.value, at: Date.now() });
        }
        return { postId: input.postId, commentId: input.commentId ?? null, myVote: input.value, score: target.score + delta };
    });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string, onlyUnread = false) {
    const snap = await notifications(userId).orderBy("createdAt", "desc").limit(50).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data(), createdAt: new Date(d.data().createdAt).toISOString() }))
        .filter((n) => !onlyUnread || !(n as { read?: boolean }).read);
    return { unread: snap.docs.filter((d) => !d.data().read).length, notifications: items };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
    const snap = await notifications(userId).where("read", "==", false).limit(200).get();
    const batch = getFirestore().batch();
    let marked = 0;
    for (const doc of snap.docs) {
        if (ids && !ids.includes(doc.id)) continue;
        batch.update(doc.ref, { read: true });
        marked += 1;
    }
    if (marked) await batch.commit();
    return { marked };
}
