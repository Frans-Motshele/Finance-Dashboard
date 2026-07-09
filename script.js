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
    createAccbtn.addEventListener("click", (event) => {
        event.preventDefault()
        window.location.href = "Index.html"
    })
}

if(loginbtn){
    loginbtn.addEventListener("click",(event)=>{
        event.preventDefault
        window.location.href=""
    })
}





