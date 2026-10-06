import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncidentPanel } from './incident-panel';

describe('IncidentPanel', () => {
  let component: IncidentPanel;
  let fixture: ComponentFixture<IncidentPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentPanel],
    }).compileComponents();

    fixture = TestBed.createComponent(IncidentPanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
