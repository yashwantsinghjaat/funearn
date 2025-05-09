// Image preview before uploading
const profilePicInput = document.getElementById('profilePic');
const previewImage = document.getElementById('previewImage');

profilePicInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    previewImage.src = URL.createObjectURL(file);
  }
});

// Save Changes (Example logic)
const updateForm = document.getElementById('updateForm');

updateForm.addEventListener('submit', function(event) {
  event.preventDefault();
  
  const newName = document.getElementById('name').value;
  // const newProfilePic = profilePicInput.files[0]; // You can send this to server if you have backend

  alert('Profile Updated!\nName: ' + newName);
  
  // Here you can add logic to POST the data to your server/backend
});


