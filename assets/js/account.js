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

let button = document.getElementById("updateKey")
let updated = document.getElementById("updatedKey")
button.addEventListener("click", () => {
    updateKey()
})
updated.addEventListener("keyup", async (event) => {
    if (event.keyCode !== 13) return;
    updateKey()
})

function updateKey() {
    let key = document.getElementById("updatedKey").value
    let BaseJSON = {
        "action": "update-key",
        "data": {
            key
        }
    }
    fetch("/api/panel", {
        method: "POST",
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json'
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
    }).catch((e)=> {
        console.log(e)
        Toast.fire({
            icon: 'error',
            title: 'No se puede conectar con el servidor.',
            timer: 2500
        })
    })
}

let resetPwdBtn = document.getElementById("resetPwd")
resetPwdBtn.addEventListener("click", () => {
    resetPwd()
})

function resetPwd() {
    resetPwdBtn.disabled = true
    fetch("/api/panel", {
        method: "POST",
        headers: {
            'content-type': 'application/json',
            'accept': 'application/json'
        },
        body: JSON.stringify({ "action": "reset-password" })
    }).then(response => response.json())
    .then(json => {
        Toast.fire({
            icon: json.icon,
            title: json.message,
            timer: json.timer
        })      
    }).catch((e)=> {
        console.log(e)
        Toast.fire({
            icon: 'error',
            title: 'No se puede conectar con el servidor.',
            timer: 2500
        })
    })
}