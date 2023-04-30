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

let formLogin = document.getElementById("formLogin")
formLogin.addEventListener("submit", function(form) {
    form.preventDefault()
    login()
})

function login() {

    let btn = document.getElementById("btnLogin")
    btn.disabled = true
    setTimeout(() => {
        btn.disabled = false
    }, 2500)
    let email = document.getElementById("emailLogin")?.value ? document.getElementById("emailLogin").value : null
    let password = document.getElementById("passwordLogin")?.value ? document.getElementById("passwordLogin").value : null

    if(!email || !password) {
        return Toast.fire({
            icon: 'error',
            title: 'You may fill all the fields.',
            timer: 2500
        })
    }

    let BaseJSON = { email, password }

    fetch("/api/login", {
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