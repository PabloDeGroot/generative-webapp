import { z } from "zod/v4";
import type { DomainToolkit } from "../types";
import { requireUser } from "../shared/state";
import {
    BOARDS, BOARD_IDS, LIMITS, addComment, createPost, deleteComment, deletePost, editComment, editPost, getPost,
    getProfile, listBoards, listNotifications, listPosts, markNotificationsRead, searchPosts, updateProfile, vote
} from "./forum";

const tags = z.array(z.string().max(30)).max(LIMITS.tags);

export const communityToolkit: DomainToolkit = {
    id: "community",
    description: [
        "This site is a community discussion board: members post in topic boards, comment in threads, and vote.",
        `Boards: ${BOARDS.map((b) => `${b.id} (${b.name})`).join(", ")}.`,
        "Anyone can read. Signed-in members can post, comment, reply (threads nest up to 6 levels), vote posts and comments up or down, edit or delete their own content, set a display name and bio, and get notified of replies.",
        "All user text (titles, bodies, comments, names) is already HTML-escaped: insert it into pages exactly as returned, never decode or unescape it.",
        "Design hints: clean, readable, community-forum feel; compact post lists with score, comment count, author and age; clear thread indentation for replies; obvious vote buttons and reply boxes.",
        "Sample routes: /, /b/<board>, /post/<postId>, /u/<userId>, /submit, /search/<query>, /notifications."
    ].join(" "),
    tools: [
        // --- Reading (public) --------------------------------------------------------------------
        {
            name: "ListBoards",
            description: "Lists the boards with their descriptions, number of posts and last activity.",
            inputSchema: {},
            readOnly: true,
            handler: async () => listBoards()
        },
        {
            name: "ListPosts",
            description: "Lists posts, optionally in one board, with a tag, or by one author. sort: hot (default), new, top or active (latest comment). Each post has title, excerpt, tags, author, score, comment count, age and — when signed in — the user's own vote (1, -1 or 0).",
            inputSchema: {
                board: z.enum(BOARD_IDS).optional(),
                sort: z.enum(["hot", "new", "top", "active"]).optional(),
                tag: z.string().optional(),
                authorId: z.string().optional(),
                limit: z.number().int().min(1).max(50).optional(),
                offset: z.number().int().min(0).optional()
            },
            readOnly: true,
            handler: async (args: Parameters<typeof listPosts>[1], ctx) => listPosts(ctx.userId, args)
        },
        {
            name: "GetPost",
            description: "One post with its full body and the whole comment thread as a tree (each comment has replies[], depth, author, score, and the user's own vote when signed in). Deleted comments show as [deleted] but keep their replies.",
            inputSchema: { postId: z.string().min(1) },
            readOnly: true,
            handler: async ({ postId }: { postId: string }, ctx) => getPost(ctx.userId, postId)
        },
        {
            name: "SearchPosts",
            description: "Searches recent posts by text in the title, body or tags.",
            inputSchema: { query: z.string().min(1).max(100), limit: z.number().int().min(1).max(50).optional() },
            readOnly: true,
            handler: async ({ query, limit }: { query: string; limit?: number }) => searchPosts(query, limit)
        },
        {
            name: "GetProfile",
            description: "A member's profile: display name, photo, bio, member since, post and comment counts, karma (net votes received) and recent posts. Omit userId for the signed-in user's own profile.",
            inputSchema: { userId: z.string().min(1).optional() },
            readOnly: true,
            handler: async ({ userId }: { userId?: string }, ctx) => getProfile(userId ?? requireUser(ctx.userId))
        },
        {
            name: "ListNotifications",
            description: "The signed-in user's notifications: replies to their posts and comments (who replied, an excerpt, the post), newest first, with the unread count.",
            inputSchema: { onlyUnread: z.boolean().optional() },
            readOnly: true,
            requiresAuth: true,
            handler: async ({ onlyUnread }: { onlyUnread?: boolean }, ctx) => listNotifications(requireUser(ctx.userId), onlyUnread)
        },

        // --- Participating (signed-in members) ---------------------------------------------------
        {
            name: "CreatePost",
            description: `Creates a post in a board. Limits: title ${LIMITS.title} characters, body ${LIMITS.body}, up to ${LIMITS.tags} tags, ${LIMITS.postsPerHour} posts per hour.`,
            inputSchema: {
                board: z.enum(BOARD_IDS),
                title: z.string().min(1).max(LIMITS.title),
                body: z.string().min(1).max(LIMITS.body),
                tags: tags.optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async (args: Parameters<typeof createPost>[1], ctx) => createPost(requireUser(ctx.userId), args)
        },
        {
            name: "EditPost",
            description: "Edits the title, body or tags of the signed-in user's own post.",
            inputSchema: {
                postId: z.string().min(1),
                title: z.string().min(1).max(LIMITS.title).optional(),
                body: z.string().min(1).max(LIMITS.body).optional(),
                tags: tags.optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ postId, ...changes }: { postId: string } & Parameters<typeof editPost>[2], ctx) =>
                editPost(requireUser(ctx.userId), postId, changes)
        },
        {
            name: "DeletePost",
            description: "Deletes the signed-in user's own post (its comments stay readable).",
            inputSchema: { postId: z.string().min(1) },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ postId }: { postId: string }, ctx) => deletePost(requireUser(ctx.userId), postId)
        },
        {
            name: "AddComment",
            description: `Comments on a post, or replies to a comment when parentCommentId is given. Limits: ${LIMITS.comment} characters, ${LIMITS.commentsPerHour} comments per hour, threads ${LIMITS.maxDepth} levels deep. The person replied to is notified.`,
            inputSchema: {
                postId: z.string().min(1),
                body: z.string().min(1).max(LIMITS.comment),
                parentCommentId: z.string().min(1).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async (args: Parameters<typeof addComment>[1], ctx) => addComment(requireUser(ctx.userId), args)
        },
        {
            name: "EditComment",
            description: "Edits the signed-in user's own comment.",
            inputSchema: { postId: z.string().min(1), commentId: z.string().min(1), body: z.string().min(1).max(LIMITS.comment) },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ postId, commentId, body }: { postId: string; commentId: string; body: string }, ctx) =>
                editComment(requireUser(ctx.userId), postId, commentId, body)
        },
        {
            name: "DeleteComment",
            description: "Deletes the signed-in user's own comment (replies to it stay in the thread).",
            inputSchema: { postId: z.string().min(1), commentId: z.string().min(1) },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ postId, commentId }: { postId: string; commentId: string }, ctx) =>
                deleteComment(requireUser(ctx.userId), postId, commentId)
        },
        {
            name: "Vote",
            description: "Votes on a post, or on a comment when commentId is given: value 1 (up), -1 (down) or 0 (remove vote). Changing a vote replaces it. You can't vote on your own content.",
            inputSchema: {
                postId: z.string().min(1),
                commentId: z.string().min(1).optional(),
                value: z.union([z.literal(1), z.literal(0), z.literal(-1)])
            },
            readOnly: false,
            requiresAuth: true,
            handler: async (args: Parameters<typeof vote>[1], ctx) => vote(requireUser(ctx.userId), args)
        },
        {
            name: "UpdateProfile",
            description: `Sets the signed-in user's display name (up to ${LIMITS.displayName} characters) and/or bio (up to ${LIMITS.bio}).`,
            inputSchema: {
                displayName: z.string().min(1).max(LIMITS.displayName).optional(),
                bio: z.string().max(LIMITS.bio).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async (args: { displayName?: string; bio?: string }, ctx) => updateProfile(requireUser(ctx.userId), args)
        },
        {
            name: "MarkNotificationsRead",
            description: "Marks the signed-in user's notifications as read: the given ids, or all when ids is omitted.",
            inputSchema: { ids: z.array(z.string()).max(200).optional() },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ ids }: { ids?: string[] }, ctx) => markNotificationsRead(requireUser(ctx.userId), ids)
        }
    ]
};
