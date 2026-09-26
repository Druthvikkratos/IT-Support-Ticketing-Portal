import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkUploadModal } from './bulk-upload-modal';

describe('BulkUploadModal', () => {
  let component: BulkUploadModal;
  let fixture: ComponentFixture<BulkUploadModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkUploadModal],
    }).compileComponents();

    fixture = TestBed.createComponent(BulkUploadModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
