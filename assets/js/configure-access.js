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

let button = document.getElementById("accessPwd")
let pwd = document.getElementById("pwd")
button.addEventListener("click", () => {
    access()
})
pwd.addEventListener("keyup", async (event) => {
    if (event.keyCode !== 13) return;
    access()
})

function access() {
    let password = document.getElementById("pwd").value
    let BaseJSON = {
        "action": "access",
        data: {
            password
        }
    }
    fetch("/api/configuration", {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(BaseJSON)
    }).then(response => response.json())
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
        }).catch((e) => {
            console.log(e)
            Toast.fire({
                icon: 'error',
                title: 'No se puede conectar con el servidor.',
                timer: 2500
            })
        })
}

