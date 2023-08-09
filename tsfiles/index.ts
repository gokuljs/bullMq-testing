import express from "express";
import { Redis } from "ioredis";
import { Queue } from "bullmq";
import { Worker } from "bullmq";

const PORT = 3000;

const app = express();
const redis = new Redis();

const myQueue = new Queue("foo", { connection: redis });

async function addJobs() {
  await myQueue.add("myJobName", { foo: "bar" });
  await myQueue.add("myJobName", { qux: "baz" });
}
const worker = new Worker(
  "foo",
  async (job) => {
    console.log(job.data);
  },
  { connection: redis }
);
worker.on("completed", (job) => {
  console.log(`${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`${job?.id} has failed with ${err.message}`);
});
await addJobs();

app.listen(PORT, () => {
  console.log("Server is running in port 3000");
});
