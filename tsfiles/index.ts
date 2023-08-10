import express from "express";
import { Redis } from "ioredis";
import { Job, Queue } from "bullmq";
import { Worker } from "bullmq";
import path, { join, dirname } from "path";
import { fileURLToPath } from "url";

const PORT = 3000;
const QUEUE_NAME = "worker_queue";
const SANDBOXED_WORKER_QUEUE = "sandboxed_worker_queue";
const app = express();
const redis = new Redis();
const queueInstance = new Queue(QUEUE_NAME, { connection: redis });
const __dirname = dirname(fileURLToPath(import.meta.url));
const processorFile = path.join(__dirname, "workers", "test-worker.js");

const addJobs = async () => {
  console.log("adding jobs");
  await queueInstance.add("job1", { number: 300 }, { priority: 2 });
  await queueInstance.add(
    "job2",
    { number: 40000 },
    {
      priority: 1,
      attempts: 1,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );
};
const intensiveSort = (n: number) => {
  const data = [...Array(n)].map(() => Math.floor(Math.random() * 10000));
  const two = [...Array(n)].map(() => Math.floor(Math.random() * 10000));
  data.sort((a, b) => b - a);
  return [...data, ...two];
};

await addJobs();
const WorkerInstance = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.data.number) {
      return intensiveSort(job.data.number);
    }
  },
  {
    autorun: false,
    concurrency: 10, //The concurrency factor is a worker option that determines how many jobs are allowed to be processed in parallel
  }
);

WorkerInstance.on("completed", (job: Job, returnvalue: any) => {
  console.log("Job completed: ", job.name, returnvalue);
});
WorkerInstance.on("progress", (job: Job, progress: number | object) => {
  // Do something with the return value.
  console.log("Job progress: ", job.name);
});

WorkerInstance.on("error", (err) => {
  // log the error
  console.error(err);
});

app.get("/trigger", (req, res) => {
  console.log("process triggered");
  WorkerInstance.run();
});

// Sandboxed worker
// console.log(processorFile);
// const sandBoxedWorker = new Worker(SANDBOXED_WORKER_QUEUE, processorFile, {
//   useWorkerThreads: true,
//   concurrency: 100,
//   autorun: false,
// });

// sandBoxedWorker.run();
// // routes
app.get("/:jobName", async (req, res) => {
  const jobName = req.params.jobName;
  if (jobName && typeof jobName === "string") {
    await queueInstance.add(jobName, { number: 3000 });
  }
});

app.listen(PORT, () => {
  console.log("Server is running in port 3000");
});
