import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PaymentList } from './payment-list/payment-list';

@Component({
  imports: [PaymentList],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('Paywint_machine_test');
}
