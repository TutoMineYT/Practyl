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

let button = document.getElementById("save")
button.addEventListener("click", () => {
    send()
})
function send() {
    let dDomain = document.getElementById("domain").value
    let pDomain = document.getElementById("pDomain").value
    let pKey = document.getElementById("pKey").value
    let maxRAM = document.getElementById("maxRAM").value
    let maxCPU = document.getElementById("maxCPU").value
    let maxDISK = document.getElementById("maxDISK").value
    let maxSERVER = document.getElementById("maxSERVER").value
    let BaseJSON = {
        "action": "configure",
        data: {
            dDomain,
            pDomain,
            pKey,
            limits: {
                maxRAM: parseInt(maxRAM),
                maxCPU: parseInt(maxCPU),
                maxDISK: parseInt(maxDISK),
                maxSERVER: parseInt(maxSERVER)
            }
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
            if (json.link) {
                setTimeout(function () {
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

