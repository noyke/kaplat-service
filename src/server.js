const express = require("express");

const app = express();
app.use(express.json()); // To parse the incoming requests with JSON payloads
let idCounter = 1;

const STATUS = {
  PENDING: "PENDING",
  LATE: "LATE",
  DONE: "DONE",
};

const SORT = {
  ID: "ID",
  DUE_DATE: "DUE_DATE",
  TITLE: "TITLE",
};

const todos = [];

app.get("/todo/health", (req, res) => {
  return res.status(200).send("OK");
});

app.post("/todo", (req, res) => {
  const isTodoExists = todos.some((todo) => todo.title === req.body.title);
  const isDueDateInTheFuture = new Date(req.body.dueDate) > new Date();

  if (isTodoExists) {
    return res.status(409).send({
      errorMessage: `Error: TODO with the title [${req.body.title}] already exists in the system`,
    });
  }

  if (!isDueDateInTheFuture) {
    return res.status(409).send({
      errorMessage: `Error: Can't create new TODO that its due date is in the past`,
    });
  }

  const newTodo = {
    id: idCounter,
    title: req.body.title,
    content: req.body.content,
    dueDate: new Date(req.body.dueDate),
    status: STATUS.PENDING,
  };

  todos.push(newTodo);
  idCounter++;

  return res.status(200).send({ result: newTodo.id });
});

app.get("/todo/size", (req, res) => {
  const status = req.query.status;

  if (status !== "ALL" && !(status in STATUS)) {
    return res.status(400).send({ errorMessage: "bad request" });
  }
  if (status === "ALL") {
    return res.status(200).send({ result: todos.length });
  }

  const result = todos.filter((todo) => todo.status === status);

  return res.status(200).send({ result: result.length });
});

app.get("/todo/content", (req, res) => {
  const status = req.query.status;
  const sortBy = req.query.sortBy;
  let finalResult;

  if (status !== "ALL" && !(status in STATUS)) {
    return res.status(400).send({ errorMessage: "bad request" });
  }

  if (sortBy !== undefined && !(sortBy in SORT)) {
    return res.status(400).send({ errorMessage: "bad request" });
  }

  if (status === "ALL") {
    result = todos.slice();
    if (sortBy === SORT.DUE_DATE) {
      finalResult = JSON.stringify(
        result.sort((a, b) => a.dueDate - b.dueDate)
      );
    } else if (sortBy === SORT.TITLE) {
      finalResult = JSON.stringify(
        result.sort((a, b) => a.title.localeCompare(b.title))
      );
    } else {
      finalResult = JSON.stringify(todos); //sortby =ID or undefined
    }
  } else {
    const result = todos.filter((todo) => todo.status === status);
    if (sortBy === SORT.DUE_DATE) {
      finalResult = JSON.stringify(
        result.sort((a, b) => a.dueDate - b.dueDate)
      );
    } else if (sortBy === SORT.TITLE) {
      finalResult = JSON.stringify(
        result.sort((a, b) => a.title.localeCompare(b.title))
      );
    } else {
      finalResult = JSON.stringify(result); //sortby =ID or undefined
    }
  }

  return res.status(200).send({ result: finalResult });
});

app.put("/todo", (req, res) => {
  const id = req.query.id;
  const status = req.query.status;

  if (!(status in STATUS)) {
    return res.status(400).send({ errorMessage: "bad request" });
  }

  const index = todos.findIndex((e) => e.id === parseInt(id));

  if (index !== -1) {
    const lastStatus = todos[index].status;
    todos[index].status = status;
    return res.status(200).send({ result: lastStatus });
  } else {
    return res
      .status(404)
      .send({ errorMessage: `Error: no such TODO with id ${id}` });
  }
});

app.delete("/todo", (req, res) => {
  const id = req.query.id;
  const index = todos.findIndex((e) => e.id === parseInt(id));

  if (index !== -1) {
    todos.splice(index, 1);
    return res.status(200).send({ result: todos.length });
  } else {
    return res
      .status(404)
      .send({ errorMessage: `Error: no such TODO with id ${id}` });
  }
});

const PORT = 8496;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
