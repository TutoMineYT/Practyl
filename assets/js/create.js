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

let formCreate = document.getElementById("formCreate")
formCreate.addEventListener("submit", function(form) {
    form.preventDefault()
    create()
})

function create() {

    let btn = document.getElementById("btnCreate")
    btn.disabled = true
    setTimeout(() => {
        btn.disabled = false
    }, 2500)
    let name = document.getElementById("nameCreate")?.value ? document.getElementById("nameCreate").value : null
    let cpu = document.getElementById("cpuCreate")?.value ? document.getElementById("cpuCreate").value : null
    let ram = document.getElementById("ramCreate")?.value ? document.getElementById("ramCreate").value : null
    let disk = document.getElementById("diskCreate")?.value ? document.getElementById("diskCreate").value : null
    let type = document.getElementById("typeCreate")?.value ? document.getElementById("typeCreate").value : null

    let BaseJSON = { "action": "create-server", data: { name, cpu, ram, disk, type } }
    fetch("/api/panel", {
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