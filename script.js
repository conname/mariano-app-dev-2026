let todo = {
    ref: "",
    state: false, 
    todo: "task",
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

display.addEventListener ("input", (event) => {
    if (event.className !== "edit-todo")
        return;

    let id = event.id;

    editTodo(id);
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

    listTodo.push(
        {
            ref: r,
            state: false,
            todo: todoText
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
    todo.id = r;
    todoVal.className = "edit-todo";
    todoVal.textContent = todoText;
    todoVal.contentEditable = "true";

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
        console.log(listTodo[i].state, document.querySelector("input#"+listTodo[i].ref+".check-todo").checked, listTodo[i].todo);
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

function editTodo(id) {

    let text = document.querySelector("span#"+id+".edit-todo");
    const newTodo = document.createElement("input");
    newTodo.type = "text";
    newTodo.id = id;
    newTodo.className = "editing";
    newTodo.value = text.textContent;

    newTodo.addEventListener("blur", function(){

        let original = listTodo.find(todo => todo.ref === id)?.todo;

        if (newTodo.value !== original) {
            original = newTodo.value;
        }

        text.textContent = this.value;
        this.replaceWith(text);
    });

    text.replaceWith(newTodo);

    newTodo.focus();

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
