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
        "action": "save-general",
        data: {
            name: document.getElementById("name").value,
            domain: document.getElementById("domain").value,
            discord: document.getElementById("discord").value,
            afkPage: document.getElementById("afkPage").checked,
            storePage: document.getElementById("storePage").checked,
            emailLogin: document.getElementById("emailLogin").checked,
            oauth2: document.getElementById("oauth2").checked
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