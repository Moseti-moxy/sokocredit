// src/features/customers/pages/CustomerOnboardingPage.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import DocumentUpload from '../components/DocumentUpload';
import './CustomerOnboardingPage.css';

const STEPS = ['Personal Info', 'Business Details', 'Documents'];

const stepSchemas = [
  yup.object({
    fullName: yup.string().required('Full name is required'),
    phoneNumber: yup
      .string()
      .matches(/^(?:\+254|0)7\d{8}$/, 'Enter a valid Kenyan phone number')
      .required('Phone number is required'),
    idNumber: yup
      .string()
      .matches(/^\d{6,8}$/, 'ID number must be 6-8 digits')
      .required('ID number is required'),
  }),
  yup.object({
    businessName: yup.string().required('Business name is required'),
    businessType: yup.string().required('Select a business type'),
    market: yup.string().required('Market location is required'),
    yearsOperating: yup
      .number()
      .typeError('Enter a number')
      .min(0, 'Cannot be negative')
      .required('Required'),
  }),
  yup.object({}), // Document step validated separately (files, not form fields)
];

export default function CustomerOnboardingPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [idDocument, setIdDocument] = useState(null);
  const [permitDocument, setPermitDocument] = useState(null);
  const [submitError, setSubmitError] = useState('');

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(stepSchemas[stepIndex]),
    mode: 'onBlur',
  });

  const isLastStep = stepIndex === STEPS.length - 1;

  const goNext = async () => {
    const isValid = await trigger();
    if (!isValid) return;

    if (isLastStep) return; // final submit handled by onSubmit
    setStepIndex((i) => i + 1);
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const onSubmit = async (data) => {
    if (!isLastStep) {
      goNext();
      return;
    }

    if (!idDocument) {
      setSubmitError('Please upload a copy of the customer\u2019s ID before submitting.');
      return;
    }

    setSubmitError('');

    const payload = {
      ...data,
      documents: [
        { type: 'id', file: idDocument },
        ...(permitDocument ? [{ type: 'permit', file: permitDocument }] : []),
      ],
    };

    // POST to customersApi.js — swapped in once backend is live:
    // await createCustomer(payload)
    console.log('Submitting new customer', payload);
  };

  return (
    <div className="onboarding-page">
      <header className="onboarding-page__header">
        <h1>New Customer</h1>
        <p>Add a trader profile to the SokoCredit directory.</p>
      </header>

      {/* Step indicator */}
      <ol className="onboarding-page__steps" aria-label="Onboarding progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index === stepIndex
                ? 'onboarding-page__step--active'
                : index < stepIndex
                ? 'onboarding-page__step--done'
                : ''
            }
          >
            <span className="onboarding-page__step-number">
              {index < stepIndex ? '✓' : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <form className="onboarding-page__form" onSubmit={handleSubmit(onSubmit)}>
        {stepIndex === 0 && (
          <fieldset className="onboarding-page__fieldset">
            <legend>Personal Info</legend>

            <label>
              Full Name
              <input type="text" placeholder="e.g. Jane Doe" {...register('fullName')} />
              {errors.fullName && <span className="field-error">{errors.fullName.message}</span>}
            </label>

            <label>
              Phone Number
              <input type="tel" placeholder="e.g. 0712 345 678" {...register('phoneNumber')} />
              {errors.phoneNumber && (
                <span className="field-error">{errors.phoneNumber.message}</span>
              )}
            </label>

            <label>
              National ID Number
              <input type="text" placeholder="e.g. 34521987" {...register('idNumber')} />
              {errors.idNumber && <span className="field-error">{errors.idNumber.message}</span>}
            </label>
          </fieldset>
        )}

        {stepIndex === 1 && (
          <fieldset className="onboarding-page__fieldset">
            <legend>Business Details</legend>

            <label>
              Business Name
              <input type="text" placeholder="e.g. Jane's Fresh Produce" {...register('businessName')} />
              {errors.businessName && (
                <span className="field-error">{errors.businessName.message}</span>
              )}
            </label>

            <label>
              Business Type
              <select {...register('businessType')} defaultValue="">
                <option value="" disabled>
                  Select type
                </option>
                <option value="Fresh Produce Vendor">Fresh Produce Vendor</option>
                <option value="Hardware Supplies">Hardware Supplies</option>
                <option value="Textiles & Fabrics">Textiles & Fabrics</option>
                <option value="Other">Other</option>
              </select>
              {errors.businessType && (
                <span className="field-error">{errors.businessType.message}</span>
              )}
            </label>

            <label>
              Market Location
              <input type="text" placeholder="e.g. Gikomba Market" {...register('market')} />
              {errors.market && <span className="field-error">{errors.market.message}</span>}
            </label>

            <label>
              Years Operating
              <input type="number" min="0" placeholder="e.g. 3" {...register('yearsOperating')} />
              {errors.yearsOperating && (
                <span className="field-error">{errors.yearsOperating.message}</span>
              )}
            </label>
          </fieldset>
        )}

        {stepIndex === 2 && (
          <fieldset className="onboarding-page__fieldset">
            <legend>Documents</legend>

            <DocumentUpload label="National ID (required)" onFileSelected={setIdDocument} />
            <DocumentUpload label="Business Permit (optional)" onFileSelected={setPermitDocument} />

            {submitError && <span className="field-error">{submitError}</span>}
          </fieldset>
        )}

        <div className="onboarding-page__actions">
          {stepIndex > 0 && (
            <button type="button" className="btn btn--icon" onClick={goBack}>
              Back
            </button>
          )}
          <button type="submit" className="btn btn--primary">
            {isLastStep ? 'Create Customer' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
}
