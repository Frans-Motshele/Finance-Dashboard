//buttons
const registerbtn = document.getElementById("rgbtn")
const continuebtn = document.getElementById("continuebtn")
const backbtn = document.getElementById("backbtn")
const createAccbtn = document.getElementById("createAccbtn")
const loginbtn = document.getElementById("loginbtn")

//moving between pages with buttons
if (registerbtn) {
    registerbtn.addEventListener("click", () => {
        window.location.href = "register.html"
    })
}

if (continuebtn) {
    continuebtn.addEventListener("click", (event) => {
        event.preventDefault()
        window.location.href = "Accountsetup.html"
    })
}

if (backbtn) {
    backbtn.addEventListener("click", () => {
        window.location.href = "register.html"
    })
}

if (createAccbtn) {
    createAccbtn.form.addEventListener("submit", (event) => {
        event.preventDefault()
        localStorage.removeItem("username")
        localStorage.removeItem("password")
        if (confirmPassword()) {
            
            localStorage.setItem("username", username.value)
            window.location.href = "Index.html"
        }
    })
}

if(loginbtn){
    loginbtn.form.addEventListener("submit",(event)=>{
        event.preventDefault()

        if (login_password.value === localStorage.getItem("password") && login_username.value === localStorage.getItem("username")){
        window.location.href="dashboard.html"
        }else{
            window.alert("login details are incorrect")
        }
    })
}
//input from index page
login_password =document.getElementById("login-password")
login_username = document.getElementById("login-username")

//input from Accountsetup page
password =document.getElementById("password")
confirmedPass = document.getElementById("confirm-password")
username = document.getElementById("username")


function confirmPassword(){
    if (password.value == confirmedPass.value){
        localStorage.setItem("password", confirmedPass.value)
        return true
    }else{
        window.alert("passwords do not match")
        return false
    }
}

//localStorage of users data ( i know its not recommended,well move this data to databases soon)
