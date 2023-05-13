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

const button = document.getElementById("save")
button.addEventListener('click', () => {
    save()
})

function save() {
    let BaseJSON = {
        "action": "save-usuarios",
        data: {
            limits: {
                maxRAM: parseInt(document.getElementById("maxRAM").value),
                maxCPU: parseInt(document.getElementById("maxCPU").value),
                maxSERVER: parseInt(document.getElementById("maxSERVER").value),
                maxDISK: parseInt(document.getElementById("maxDISK").value)
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