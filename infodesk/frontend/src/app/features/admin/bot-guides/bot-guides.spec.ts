import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BotGuides } from './bot-guides';

describe('BotGuides', () => {
  let component: BotGuides;
  let fixture: ComponentFixture<BotGuides>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BotGuides],
    }).compileComponents();

    fixture = TestBed.createComponent(BotGuides);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
