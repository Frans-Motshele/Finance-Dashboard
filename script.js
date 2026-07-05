//buttons
const registerbtn=document.getElementById("rgbtn")
const continuebtn = document.getElementById("continuebtn")
const backbtn = document.getElementById("backbtn")
const createAccbtn = document.getElementById("createAccbtn")
    
//moving between pages with buttons
registerbtn.addEventListener("click",()=>{
    window.location.href="register.html"
})

continuebtn.addEventListener("click",()=>{
    window.location.href="accountsetup.html"
})

backbtn.addEventListener("click",()=>{
    window.location.href="register.html"
})

createAccbtn.addEventListener("click",()=>{
    window.location.href="index.html"
})



