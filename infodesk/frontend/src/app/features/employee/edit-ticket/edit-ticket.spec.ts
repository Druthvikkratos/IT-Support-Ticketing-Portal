import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditTicket } from './edit-ticket';

describe('EditTicket', () => {
  let component: EditTicket;
  let fixture: ComponentFixture<EditTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditTicket],
    }).compileComponents();

    fixture = TestBed.createComponent(EditTicket);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
