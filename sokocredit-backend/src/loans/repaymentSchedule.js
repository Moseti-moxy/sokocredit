const DAYS_PER_FREQUENCY = { daily: 1, weekly: 7, monthly: 30 };

export function numberOfInstallments(duration, durationUnit, frequency) {
  const durationInDays = durationUnit === 'days' ? duration : duration * 30;
  return Math.max(1, Math.ceil(durationInDays / DAYS_PER_FREQUENCY[frequency]));
}

export function createRepaymentSchedule({ amount, interestRate, duration, durationUnit, repaymentFrequency, startDate }) {
  const installments = numberOfInstallments(duration, durationUnit, repaymentFrequency);
  const totalDue = amount + (amount * interestRate) / 100;
  const installmentAmount = Number((totalDue / installments).toFixed(2));
  const start = new Date(startDate);

  return Array.from({ length: installments }, (_, index) => {
    const dueDate = new Date(start);
    dueDate.setDate(start.getDate() + DAYS_PER_FREQUENCY[repaymentFrequency] * (index + 1));
    const due = index === installments - 1
      ? Number((totalDue - installmentAmount * (installments - 1)).toFixed(2))
      : installmentAmount;
    return {
      installment: index + 1,
      dueDate: dueDate.toISOString().slice(0, 10),
      amountDue: due,
      amountPaid: 0,
      status: 'PENDING',
    };
  });
}
