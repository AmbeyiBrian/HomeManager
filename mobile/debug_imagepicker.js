import * as ImagePicker from 'expo-image-picker';

console.log('ImagePicker object:', ImagePicker);
console.log('ImagePicker.MediaTypeOptions:', ImagePicker.MediaTypeOptions);
console.log('ImagePicker.MediaType:', ImagePicker.MediaType);

if (ImagePicker.MediaTypeOptions) {
  console.log('MediaTypeOptions.Images:', ImagePicker.MediaTypeOptions.Images);
}

if (ImagePicker.MediaType) {
  console.log('MediaType.Images:', ImagePicker.MediaType.Images);
}
