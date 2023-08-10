import { SandboxedJob } from "bullmq";

const intensiveSort = (n: number) => {
  const data = [...Array(n)].map(() => Math.floor(Math.random() * 1000000));
  const dataTwo = [...Array(n)].map(() => Math.floor(Math.random() * 1000000));
  data.sort((a, b) => a - b);
  console.log({ data, n });
  return [...data, ...dataTwo];
};

const sandBoxedProcess = async (job: SandboxedJob) => {
  console.log(intensiveSort(100));
};

export default sandBoxedProcess;
