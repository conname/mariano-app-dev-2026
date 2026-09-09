let todo = {
    ref: "",
    state: false, 
    todoContent: "task",
}

let listTodo = [];

const form = document.getElementById("addTodo");
const textarea = document.getElementById("add-todo");
const display = document.getElementById("display");
const clear = document.getElementById("clear");

window.addEventListener("load", () => {
    loadTodos();
});

form.addEventListener("submit", (event) => {
    event.preventDefault();
    addTodo();
});

form.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        addTodo();
    }
});

textarea.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = `${this.scrollHeight}px`;
});

textarea.addEventListener("blur", function () {
    this.style.height = "";
    this.style.setProperty("--placeholder","#f0f2f5");
    this.placeholder = "task?";
});

display.onclick = function(event) {
    if (event.target.className !== "delete")
        return;
    let e = event.target;
    let id = event.target.id;
    deleteTodo(e,id);
}

display.addEventListener ("change", (event) => {
    if (event.target.className !== "checked")
        return;
    let checkState = event.target.checked;
    let id = event.target.id;

    doneTodo(id, checkState);
});

clear.onclick = function(event) {
    clearTodos(event);
}


function addTodo() {
    let acceptTodo = document.getElementById("add-todo");
    let todoText = acceptTodo.value;
    if (todoText === "") {
        acceptTodo.style.setProperty("--placeholder","red");
        acceptTodo.placeholder = "add a task hey.";
        return;
    } else {
        acceptTodo.style.setProperty("--placeholder","#f0f2f5");
        acceptTodo.placeholder = "task?";
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
    
    renderTodos(r, todoText);
        
    console.log("Todo saved.");

    checkTodo();
    
}

function renderTodos(r,todoText) {
    
    const li = document.createElement("li");
    li.id = r;
    li.className = "todo";

    const checktodo = document.createElement("div");
    checktodo.className = "check-todo";
    const checklabel = document.createElement("label");
    const checkspan = document.createElement("span");
    checkspan.className = "checkbox";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "checked";
    checkbox.id = r;

    checkbox.addEventListener("change", () => {
        let todo = listTodo.find(todo => todo.ref === r);
        if (checkbox.checked) {
            todo.state = true;
        } else {
            todo.state = false;
        }
    });

    checklabel.appendChild(checkbox);
    checklabel.appendChild(checkspan);

    checktodo.appendChild(checklabel);


    const todoVal = document.createElement("span");
    todoVal.id = r;
    todoVal.className = "edit-todo";
    todoVal.classList.add("body-text");
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
    deleteButton.textContent = "X";

    li.append(checktodo);
    li.append(todoVal);
    li.append(deleteButton);

    display.appendChild(li);
}

function checkTodo() {
    for ( let i = 0; i < listTodo.length; i++ ) {
        check = document.querySelectorAll("#"+listTodo[i].ref);
        let exists = false;
        if (check.length > -1 && check.length === 4 ) {
            exists = true;
        }
        console.log(`Local Storage Check: [${(i+1)}] Reference: ${listTodo[i].ref} | State: ${listTodo[i].state} | Todo: ${listTodo[i].todoContent} | Exists on Page: ${exists}`);
    }
    console.log("Todos loaded.");
}

function doneTodo(id,checkState) {
    let todo = listTodo.find(todo => todo.ref === id);
    let complete = document.querySelector(`span#${id}.edit-todo`);

    if (checkState === false) {
        console.log(complete);
        if (todo) {
            console.log("Todo not done.");
            complete.classList.remove("completed");
        }
    } else {
        if (todo) {
            console.log("Todo done.");
            complete.classList.add("completed");
        }
    }
    checkTodo();
}

function editTodo(e) {

    console.log(e.target.id);

    let lookItem = e.target.id;
    
    let todoItem = listTodo.find(todo => todo.ref === lookItem);

    let newTodo = e.target.textContent;

    console.log(todoItem.todoContent, newTodo);

    if (newTodo !== "") {
        todoItem.todoContent = newTodo;
        console.log("Todo edited.");
    } else {
        deleteTodo(e, lookItem);
    }
    
    checkTodo();
}

function deleteTodo(e,id) {
    let removeIndex = listTodo.findIndex(todo => todo.ref === id);
    if (removeIndex !== -1) {
        listTodo = listTodo.splice(removeIndex,1);
        saveTodo();
    }
    let remove = document.querySelector("li#"+id);
    remove.remove();
    checkTodo();
    console.log("Todo deleted.");
}

function saveTodo() {
    localStorage.setItem("listTodo",JSON.stringify(listTodo));
}

function loadTodos() {
    let saved = localStorage.getItem("listTodo");
    if (saved !== null) {
        listTodo = JSON.parse(saved);
        listTodo.forEach(item => {
            renderTodos(item.ref,item.todoContent);
            console.log(item.ref, item.state, item.todoContent);
        });
    } else {
        renderTodos();
        console.log("Todo list is empty.");
    }
}

function clearTodos(e) {
    let todoIndex = listTodo.map(item => item.ref);
    console.log(todoIndex);
    setTimeout(() => {
        if (localStorage.getItem("listTodo") !== null) {
            localStorage.clear();
        }
        loadTodos();
    }, 2000);
}