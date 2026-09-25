import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReassignModal } from './reassign-modal';

describe('ReassignModal', () => {
  let component: ReassignModal;
  let fixture: ComponentFixture<ReassignModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReassignModal],
    }).compileComponents();

    fixture = TestBed.createComponent(ReassignModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
