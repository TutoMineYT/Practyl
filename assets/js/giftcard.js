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

let formGiftcard = document.getElementById("formGiftcard")
formGiftcard.addEventListener("submit", function(form) {
    form.preventDefault()
    login()
})

function claim() {

    let btn = document.getElementById("btnGift")
    btn.disabled = true
    setTimeout(() => {
        btn.disabled = false
    }, 2500)
    let code = document.getElementById("codigoGiftcard")?.value ? document.getElementById("codigoGiftcard").value : null

    let BaseJSON = { "action": "claim-giftcard", "data": { code } }

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