import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Payment, PaymentsService } from '../payment';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';

@Component({
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  selector: 'app-payment-list',
  styleUrl: './payment-list.scss',
  templateUrl: './payment-list.html',
  host: {
    '(document:keydown.escape)': 'onEscapePress()'
  }
})
export class PaymentList implements OnInit {
  private paymentService = inject(PaymentsService);

  searchControl = new FormControl('');
  statusControl = new FormControl('all');

  // State Signals (guarantees UI updates immediately)
  isLoading = signal<boolean>(false);
  filteredPayments = signal<any[]>([]);

  // Pagination Signals
  currentPage = signal<number>(1);
  pageSize = signal<number>(10); // Show 10 rows per page

  selectedPayment = signal<any | null>(null);

  // Automatically computes total pages whenever filteredPayments changes
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPayments().length / this.pageSize())),
  );

  // Automatically slices the exact rows for the current page
  paginatedPayments = computed(() => {
    const startIndex = (this.currentPage() - 1) * this.pageSize();
    return this.filteredPayments().slice(startIndex, startIndex + this.pageSize());
  });

  ngOnInit(): void {
    // 2. Listen to BOTH search input and status dropdown together
    const search$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged()
    );

    const status$ = this.statusControl.valueChanges.pipe(
      startWith('all'),
      distinctUntilChanged()
    );

    combineLatest([search$, status$]).pipe(
      tap(() => {
        this.isLoading.set(true);
        this.currentPage.set(1); // Reset to page 1 whenever either filter changes
      }),
      switchMap(([query, selectedStatus]) => {
        const cleanTerm = (query || '').trim().toLowerCase();
        const statusFilter = (selectedStatus || 'all').toLowerCase();

        return from(this.paymentService.getPayments()).pipe(
          // Filter where BOTH search term AND status match
          switchMap((allPayments: any[]) => {
            const results = allPayments.filter(p => {
              const matchesSearch = !cleanTerm ||
                p.reference?.toLowerCase().includes(cleanTerm) ||
                p.customerName?.toLowerCase().includes(cleanTerm);

              const matchesStatus = statusFilter === 'all' ||
                p.status?.toLowerCase() === statusFilter;

              return matchesSearch && matchesStatus;
            });
            return of(results);
          }),
          catchError((err) => {
            console.error('Error fetching payments:', err);
            return of([]);
          })
        );
      })
    ).subscribe((results: Payment[]) => {
      this.filteredPayments.set(results);
      this.isLoading.set(false);
    });
  }

  // Pagination navigation methods
  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  onEscapePress(): void {
    if (this.selectedPayment()) {
      this.closeDetails();
    }
  }

  openDetails(payment: any): void {
    this.selectedPayment.set(payment);
  }

  closeDetails(): void {
    this.selectedPayment.set(null);
  }
}
