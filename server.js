const express = require("express");
const app = express();

const users = require("./users.js"); //IMPORT dummy database

app.use(express.json()); // IMPORTANT: parse JSON body

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
});

// get request
app.get("/", (req, res) => {
    res.json(users);
});

// post request
app.post("/users", (req, res) =>{
    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({
            message: "Name and email are required",
        });
    }

    const newUser ={
    id: users.length +1,
    name,
    email,
    };

    users.push(newUser);

    res.status(201).json(newUser);
});

// put request
app.put("/users/id", (req, res) =>{
    const id = parseInt(req.params.id);

    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "User not found" });
    }

    users[index] = {
        id: id,
        ...req.body
    };

    res.json(user[index]);
});