import express from "express";
import { Redis } from "ioredis";
import { Job, Queue } from "bullmq";
import { Worker, MetricsTime } from "bullmq";
import path, { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const PORT = 3000;
const QUEUE_NAME = "worker_queue";
const SANDBOXED_WORKER_QUEUE = "sandboxed_worker_queue";
const app = express();
const redis = new Redis();
const queueInstance = new Queue(QUEUE_NAME, {
  connection: redis,
});
const __dirname = dirname(fileURLToPath(import.meta.url));
const processorFile = path.join(__dirname, "workers", "test-worker.js");

// const totalMemory = os.totalmem();
// console.log("Total Memory (bytes):", totalMemory);
// console.log("Total Memory (MB):", totalMemory / (1024 * 1024));

const addJobs = async () => {
  console.log("adding jobs");
  await queueInstance.add(
    "job1",
    { number: 300 },
    {
      repeat: {
        every: 1000,
        limit: 5,
      },
    }
  );
  await queueInstance.add(
    "job3",
    { number: 40000000000 },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 600,
      },
    }
  );
  await queueInstance.add("job5", { number: 100 });
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
    concurrency: 1, //The concurrency factor is a worker option that determines how many jobs are allowed to be processed in parallel
    metrics: {
      maxDataPoints: MetricsTime.ONE_HOUR,
    },
  }
);

const testInstance = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.data.number) {
      return intensiveSort(job.data.number);
    }
  },
  {
    autorun: true,
    concurrency: 1, //The concurrency factor is a worker option that determines how many jobs are allowed to be processed in parallel
    metrics: {
      maxDataPoints: MetricsTime.ONE_HOUR,
    },
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
WorkerInstance.run();

// app.get("/trigger", (req, res) => {
//   console.log("process triggered");
//   WorkerInstance.run();
// });

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
