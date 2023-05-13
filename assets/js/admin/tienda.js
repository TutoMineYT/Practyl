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
        "action": "save-tienda",
        data: {
            prices: {
                ram: document.getElementById("count-ram").value,
                disk: document.getElementById("count-disk").value,
                cpu: document.getElementById("count-cpu").value,
                server: document.getElementById("count-server").value,
                "buy-limit": {
                    ram: document.getElementById("max-ram").value,
                    disk: document.getElementById("max-disk").value,
                    cpu: document.getElementById("max-cpu").value,
                    server: document.getElementById("max-server").value
                }
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