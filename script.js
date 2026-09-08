let todo = {
    ref: "",
    state: false, 
    todoContent: "task",
};

let listTodo = [];

const form = document.getElementById("addTodo");
const display = document.getElementById("display");

form.addEventListener('submit', (event) => {
    event.preventDefault();
    addTodo();
});

display.onclick = function(event) {
    if (event.target.className !== "delete")
        return;
    let e = event.target;
    let id = event.target.id;
    deleteTodo(e,id);
};

display.addEventListener ("change", (event) => {
    if (event.target.className !== "check-todo")
        return;

    let checkState = event.target.checked;
    let id = event.target.id;

    doneTodo(id, checkState);
});


function addTodo() {
    let acceptTodo = document.getElementById("add-todo");
    let todoText = acceptTodo.value;
    if (todoText === "") {
        return; /* add error message */
    }

    let r = "";

    while (/^[a-zA-Z]/.test(r) === false) {
        r = (Math.random() + 1).toString(36).substring(7);
    }

    console.log(r, todoText);

    listTodo.push(
        {
            ref: r,
            state: false,
            todoContent: todoText
        }
    );

    acceptTodo.value = "";
    saveTodo();
    
    const li = document.createElement("li");
    li.id = r;
    li.className = "todo";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = r;
    checkbox.className = "check-todo";

    checkbox.addEventListener("change", () => {
        let todo = listTodo.find(todo => todo.ref === r);
        if (checkbox.checked) {
            todo.state = true;
        } else {
            todo.state = false;
        }
    });

    const todoVal = document.createElement("span");
    todoVal.id = r;
    todoVal.className = "edit-todo";
    todoVal.textContent = todoText;
    todoVal.contentEditable = "true";

    todoVal.addEventListener("blur", editTodo);
    todoVal.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            todoVal.blur();
        }
    });

    const deleteButton = document.createElement("button");
    deleteButton.id = r;
    deleteButton.className = "delete";
    deleteButton.textContent = "delete";

    li.append(checkbox);
    li.append(todoVal);
    li.append(deleteButton);

    display.appendChild(li);

    console.log("Todo saved.");

    checkTodo();
    
}

function checkTodo() {
    for ( let i = 0; i < listTodo.length; i++ ) {
        console.log(listTodo[i].ref, listTodo[i].state, document.querySelector("input#"+listTodo[i].ref+".check-todo").checked, listTodo[i].todoContent);
    }
    console.log("Todos loaded.");
}

function doneTodo(id,checkState) {
    if (checkState === false) {
        let todo = listTodo.find(todo => todo.ref === id);
        if (todo) {
            todo.state = false;
        }
        console.log("Todo not done.");
    } else {
        let todo = listTodo.find(todo => todo.ref === id);
        if (todo) {
            todo.state = true;
        }
        console.log("Todo done.");
    }
    saveTodo();
    checkTodo();
}

function editTodo(e) {

    console.log(e.target.id);

    let lookItem = e.target.id;
    
    let todoItem = listTodo.find(todo => todo.ref === lookItem);

    let newTodo = e.target.textContent;

    console.log(todoItem.todoContent, newTodo);

    todoItem.todoContent = newTodo;

    console.log("Todo edited.");
    checkTodo();
}

function deleteTodo(e,id) {
    let removeIndex = listTodo.findIndex(todo => todo.ref === id);
    if (removeIndex !== -1) {
        listTodo.splice(removeIndex,1);
    }
    e.closest("li").remove();
    checkTodo();
    console.log("Todo deleted.");
}

function saveTodo() {
    localStorage.setItem("listTodo",JSON.stringify(listTodo));
}

function loadTodos() {
    let saved = localStorage.getItem("listTodo");
    if (saved !== null) {
        tasks = JSON.parse(saved);
    }
}
