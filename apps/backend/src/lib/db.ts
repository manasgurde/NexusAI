import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Custom Prisma Client Extension to automatically filter out soft-deleted records
export const db = prisma.$extends({
  query: {
    user: {
      async findMany({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findFirst({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findUnique({ args, query }: { args: any; query: any }) {
        const findFirstArgs = { ...args };
        findFirstArgs.where = { deletedAt: null, ...findFirstArgs.where };
        return prisma.user.findFirst(findFirstArgs);
      },
      async count({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      }
    },
    organization: {
      async findMany({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findFirst({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findUnique({ args, query }: { args: any; query: any }) {
        const findFirstArgs = { ...args };
        findFirstArgs.where = { deletedAt: null, ...findFirstArgs.where };
        return prisma.organization.findFirst(findFirstArgs);
      },
      async count({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      }
    },
    aIHistory: {
      async findMany({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findFirst({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findUnique({ args, query }: { args: any; query: any }) {
        const findFirstArgs = { ...args };
        findFirstArgs.where = { deletedAt: null, ...findFirstArgs.where };
        return prisma.aIHistory.findFirst(findFirstArgs);
      },
      async count({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      }
    },
    uploadedFile: {
      async findMany({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findFirst({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      },
      async findUnique({ args, query }: { args: any; query: any }) {
        const findFirstArgs = { ...args };
        findFirstArgs.where = { deletedAt: null, ...findFirstArgs.where };
        return prisma.uploadedFile.findFirst(findFirstArgs);
      },
      async count({ args, query }: { args: any; query: any }) {
        args.where = { deletedAt: null, ...args.where };
        return query(args);
      }
    }
  }
});
export type ExtendedPrismaClient = typeof db;
