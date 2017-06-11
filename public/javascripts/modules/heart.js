import axios from 'axios';
import { $ } from './bling';

export default function ajaxHeart(e) {
  e.preventDefault();
  // We're using axios here to immediately update page when user click heart button, instead requiring user to refresh to see changes
  axios
    .post(this.action)
    .then(res => {
      // Update store card's heart button
      // HTML trick! Can reference child element of form by their name, ie form.[name]
      const isHearted = this.heart.classList.toggle('heart__button--hearted');

      // Update header heart count
      $('.heart-count').textContent = res.data.hearts.length;

      // Apply interesting floating heart animation
      if (isHearted) {
        this.heart.classList.add('heart__button--float');
        setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);
      }
    })
    .catch(console.error);
}