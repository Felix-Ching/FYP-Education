export function print_Room(element , qR){
    qR.forEach((doc) =>{
        //console.log(doc.id, " => ", doc.data());
        let option = document.createElement('option');
        option.value = doc.data().ID;
        option.text = doc.id;
        element.appendChild(option);
    });
}