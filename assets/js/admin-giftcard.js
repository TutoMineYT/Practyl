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
})

function create() {
    console.log("CREATED")
    let code = document.getElementById("code")?.value ? document.getElementById("code").value : null
    let maxUses = document.getElementById("maxUses")?.value ? document.getElementById("maxUses").value : null
    let coins = document.getElementById("coins")?.value ? document.getElementById("coins").value : null


    let BaseJSON = { "action": "create-giftcard", data: { code, maxUses, coins } }
    fetch("/api/admin", {
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