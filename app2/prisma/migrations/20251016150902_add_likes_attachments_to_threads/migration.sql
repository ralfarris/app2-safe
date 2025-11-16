-- DropForeignKey
ALTER TABLE "public"."attachment" DROP CONSTRAINT "attachment_post_id_fkey";

-- AlterTable
ALTER TABLE "attachment" ADD COLUMN     "thread_id" INTEGER,
ALTER COLUMN "post_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "thread_like" (
    "like_id" SERIAL NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_like_pkey" PRIMARY KEY ("like_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "thread_like_thread_id_user_id_key" ON "thread_like"("thread_id", "user_id");

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "post"("post_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "thread"("thread_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_like" ADD CONSTRAINT "thread_like_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "thread"("thread_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_like" ADD CONSTRAINT "thread_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
