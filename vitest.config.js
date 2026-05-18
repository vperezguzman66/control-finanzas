export default {
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.js"],
    globals: true,
    fileParallelism: false,
  },
};
