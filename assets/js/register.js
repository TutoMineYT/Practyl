const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

let formRegister = document.getElementById("formRegister")
formRegister.addEventListener("submit", function(form) {
    form.preventDefault()
    register()
})

function register() {

    let btn = document.getElementById("btnRegister")
    btn.disabled = true
    setTimeout(() => {
        btn.disabled = false
    }, 2500)
    let username = document.getElementById("usernameRegister")?.value ? document.getElementById("usernameRegister").value : null
    let email = document.getElementById("emailRegister")?.value ? document.getElementById("emailRegister").value : null
    let password = document.getElementById("passwordRegister")?.value ? document.getElementById("passwordRegister").value : null
    let passwordConfirm = document.getElementById("passwordRepeatRegister")?.value ? document.getElementById("passwordRepeatRegister").value : null

    if(!username || !email || !password || !passwordConfirm) {
        return Toast.fire({
            icon: 'error',
            title: 'You may fill all the fields.',
            timer: 2500
        })
    }

    let BaseJSON = { email, password, username, passwordConfirm }

    fetch("/api/register", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(BaseJSON)
    }).then(respone => respone.json())
        .then(json => {
            Toast.fire({
                icon: json.icon,
                title: json.message,
                timer: json.timer
            })
            if(json.link){
                setTimeout(function() { 
                    window.location.href = json.link
                }, json.timer)
            }          
        }).catch((e)=> {
            console.log(e)
            Toast.fire({
                icon: 'error',
                title: 'No se puede conectar con el servidor.',
                timer: 2500
            })
        })
}