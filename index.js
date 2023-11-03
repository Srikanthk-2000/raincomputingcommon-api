const { uuidv4 } = require("uuid");
const server = require("./server");

const port = 8080;
process.on("exit", function () {
  console.log("db disconnected");
  mongoose.disconnect();
});
server
  .create()
  .then((s) => {
    s.listen(port, () => {
      console.log(`Server has started on port ${port}!`);
    });
  })
  .catch((err) => console.log(err));
