const express = require("express");

let { requestLogger, todoLogger } = require("./logger");
let { todoIdCounter, globalRequestCounter } = require("./globals");

const app = express();
app.use(express.json()); // To parse the incoming requests with JSON payloads

// "OnRequest" middleware
app.use((req, res, next) => {
  requestLogger.info(
    `Incoming request | #${globalRequestCounter} | resource: ${req.url} | HTTP Verb ${req.method}`
  );

  next();
});

// "OnResponse" hook
app.use((req, res, next) => {
  const start = new Date();

  res.on("finish", () => {
    const end = new Date();
    const duration = end - start;

    requestLogger.debug(
      `request #${globalRequestCounter} duration: ${duration}ms`
    );

    globalRequestCounter++;
  });

  next();
});

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

// ### Health Check Endpoint ###

app.get("/todo/health", (req, res) => {
  return res.status(200).send("OK");
});

// ### TODOs Endpoints ###

app.post("/todo", (req, res) => {
  const isTodoExists = todos.some((todo) => todo.title === req.body.title);
  const isDueDateInTheFuture = new Date(req.body.dueDate) > new Date();

  if (isTodoExists) {
    const errorMessage = `Error: TODO with the title [${req.body.title}] already exists in the system`;
    todoLogger.error(errorMessage);
    return res.status(409).send({ errorMessage });
  }

  if (!isDueDateInTheFuture) {
    const errorMessage = `Error: Can't create new TODO that its due date is in the past`;
    todoLogger.error(errorMessage);
    return res.status(409).send({ errorMessage });
  }

  const newTodo = {
    id: todoIdCounter,
    title: req.body.title,
    content: req.body.content,
    dueDate: new Date(req.body.dueDate),
    status: STATUS.PENDING,
  };

  todoLogger.info(`Creating new TODO with Title [${newTodo.title}]`);
  todoLogger.debug(
    `Currently there are ${todos.length} TODOs in the system. New TODO will be assigned with id ${newTodo.id}`
  );

  todos.push(newTodo);
  todoIdCounter++;

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

  const result = todos.filter((todo) => todo.status === status).length;

  todoLogger.info(`Total TODOs count for state ${status} is ${result}`);

  return res.status(200).send({ result });
});

app.get("/todo/content", (req, res) => {
  const status = req.query.status;
  const sortBy = req.query.sortBy;
  let finalResult;

  todoLogger.info(
    `Extracting todos content. Filter: ${status} | Sorting by: ${sortBy}`
  );

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

  todoLogger.debug(
    `There are a total of ${todos.length} todos in the system. The result holds ${finalResult.length} todos`
  );

  return res.status(200).send({ result: finalResult });
});

app.put("/todo", (req, res) => {
  const id = req.query.id;
  const status = req.query.status;

  todoLogger.info(`Update TODO id [${id}] state to ${status}`);

  if (!(status in STATUS)) {
    return res.status(400).send({ errorMessage: "bad request" });
  }

  const index = todos.findIndex((e) => e.id === parseInt(id));

  if (index !== -1) {
    const lastStatus = todos[index].status;
    todos[index].status = status;

    todoLogger.debug(
      `Todo id [${id}] state change: ${lastStatus} --> ${status}`
    );

    return res.status(200).send({ result: lastStatus });
  } else {
    const errorMessage = `Error: no such TODO with id ${id}`;
    todoLogger.error(errorMessage);
    return res.status(404).send({ errorMessage });
  }
});

app.delete("/todo", (req, res) => {
  const id = req.query.id;
  const index = todos.findIndex((e) => e.id === parseInt(id));

  if (index !== -1) {
    todos.splice(index, 1);
    const result = todos.length;

    todoLogger.info(`Removing todo id ${id}`);
    todoLogger.debug(
      `After removing todo id [${id}] there are ${result} TODOs in the system`
    );

    return res.status(200).send({ result });
  } else {
    const errorMessage = `Error: no such TODO with id ${id}`;
    todoLogger.error(errorMessage);
    return res.status(404).send({ errorMessage });
  }
});

// ### Logs Endpoints ###

const loggers = {
  "request-logger": requestLogger,
  "todo-logger": todoLogger,
};

app.get("/logs/level", (req, res) => {
  try {
    const loggerName = req.query["logger-name"];

    const level = loggers[loggerName].level.toUpperCase();

    return res.send(`Success: ${level}`);
  } catch (error) {
    return res.send(`Failure: ${error.message}`);
  }
});

app.put("/logs/level", (req, res) => {
  try {
    const loggerName = req.query["logger-name"];
    const loggerLevel = req.query["logger-level"];

    loggers[loggerName].level = loggerLevel.toLowerCase();

    return res.send(`Success: ${loggerLevel.toUpperCase()}`);
  } catch (error) {
    return res.send(`Failure: ${error.message}`);
  }
});

// ### Server ###

const PORT = 9285;

app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
