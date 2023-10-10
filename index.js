const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();


const dbPath = path.join(__dirname, "mydatabase.db");
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3005, () => {
      console.log("Server Running at http://localhost:3005/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// Get Books API.... check postman
app.get("/details/", async (request, response) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401).send("invalid jwt token");
  } else {
    jwt.verify(jwtToken, "prasanna_kumar", async (error, user) => {
      if (error) {
        response.status(401).send("Invalid access token");
      } else {
        const getBooksQuery = `
  SELECT
    *
  FROM
    users
  `;
        const booksArray = await db.all(getBooksQuery);
        response.send(booksArray);
      }
    });
  }
});


// Update user details route
app.put("/update/:user_id", async (req, res) => {
    const { user_name, user_email, user_password, user_image, total_orders } = req.body;
    const { user_id } = req.params;
    // Hash the new password before updating it
    const hashedPassword = await bcrypt.hash(user_password, 10);
    const updateUserQuery = `
      UPDATE users
      SET
        user_name = ?,
        user_email = ?,
        user_password = ?,
        user_image = ?,
        total_orders = ?
      WHERE user_id = ?
    `;
    db.run(
      updateUserQuery,
      [user_name, user_email, hashedPassword, user_image, total_orders, user_id], );
      res.send("user details update successfully")
    })
    

// User Register API
app.post("/insert/", async (req, res) => {
  const user_name=req.body.user_name;
  const user_email=req.body.user_email
  const user_password=req.body.user_password
  const user_image=req.body.user_image
  const total_orders=req.body.total_orders
  
  const hashedPassword = await bcrypt.hash(user_password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      users
    WHERE 
      user_email = '${user_email}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
     INSERT INTO
      users (user_name,user_email,user_password,user_image,total_orders) values (?,?,?,?,? );`;
    await db.run(createUserQuery,[user_name,user_email,hashedPassword,user_image,total_orders]);
    // res.send("User created successfully");
    res.redirect("/")
  } else {
    res.status(400);
    res.send("User already exists");
  }
});

// User Login API
app.post("/login/", async (request, response) => {
  const { user_email, user_password } = request.body;
  const selectUserQuery = `
    SELECT
      *
    FROM
      Users
    WHERE 
      user_email = '${user_email}';`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(user_password, dbUser.user_password);
    if (isPasswordMatched === true) {
      const payload = { user_email: user_email };
      const jwtToken = jwt.sign(payload, "prasanna_kumar");
      response.send({ jwtToken });
      //   response.send("Login Success!");
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});



app.set("view engine", "ejs"); // Set EJS as the view engine
app.set("views", path.join(__dirname, "views")); // Specify the views directory
app.use(express.static(path.join(__dirname, 'public')));



app.get("/image/:user_id/", async (request, response) => {
  try {
    const { user_id } = request.params;
    const getPlayerQuery = `
      SELECT 
        user_image 
      FROM 
        users 
      WHERE 
      user_id = ?`;
    const image = await db.get(getPlayerQuery, [user_id]);
    if (image) {
      response.send(`
      <div style="display:flex;flex-direction:row;justify-content:center;">
      <div>
      <img src="${image.user_image}" style="width: 250px;" alt="User Image" />
      <div/>
     
      <div/>
      `);
    } else {
      response.status(404).send("User not found");
    }
  } catch (error) {
    console.error("Error fetching user image:", error);
    response.status(500).send("Internal Server Error");
  }
});


//delete single user
app.delete("/delete/:user_id/", async (request, response) => {
  const { user_id } = request.params;
  const deletePlayerQuery = `
  DELETE FROM
    users
  WHERE
    user_id = ${user_id};`;
  await db.run(deletePlayerQuery);
  response.send("user Removed");
});



//get all user details without jwt
app.get("/userdetails", async (request, response) => {
  try {
    const getUsersQuery = `
      SELECT
        *
      FROM
        users;`;

    const users = await db.all(getUsersQuery);
    response.render("table", { users }); // Render the "table.ejs" template and pass the users data
  } catch (error) {
    console.error(error);
    response.status(500).send("Internal Server Error");
  }
});

//get single user details
app.get("/details/:user_id", async (request, response) => {
  const {user_id}=request.params

    const getUsersQuery = `
      SELECT
        *
      FROM
        users
        where
        user_id=${user_id};`;

    const users = await db.all(getUsersQuery);
    response.send(users)
    // response.render("table", { users }); // Render the "table.ejs" template and pass the users data
  // } catch (error) {
    // console.error(error);
    // response.status(500).send("Internal Server Error");
  
});
