import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueTypesList } from './issue-types-list';

describe('IssueTypesList', () => {
  let component: IssueTypesList;
  let fixture: ComponentFixture<IssueTypesList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueTypesList],
    }).compileComponents();

    fixture = TestBed.createComponent(IssueTypesList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
