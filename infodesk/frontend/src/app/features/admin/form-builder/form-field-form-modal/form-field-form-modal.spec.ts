import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormFieldFormModal } from './form-field-form-modal';

describe('FormFieldFormModal', () => {
  let component: FormFieldFormModal;
  let fixture: ComponentFixture<FormFieldFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFieldFormModal],
    }).compileComponents();

    fixture = TestBed.createComponent(FormFieldFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
