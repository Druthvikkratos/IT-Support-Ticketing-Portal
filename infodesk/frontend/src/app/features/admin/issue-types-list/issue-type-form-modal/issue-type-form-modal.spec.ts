import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueTypeFormModal } from './issue-type-form-modal';

describe('IssueTypeFormModal', () => {
  let component: IssueTypeFormModal;
  let fixture: ComponentFixture<IssueTypeFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueTypeFormModal],
    }).compileComponents();

    fixture = TestBed.createComponent(IssueTypeFormModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
