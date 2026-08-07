import { Component, Input, OnInit } from "@angular/core";
import { BsModalRef } from "ngx-bootstrap/modal";

@Component({
  selector: "app-authorization-dialog",
  templateUrl: "./authorization-dialog.component.html",
  styleUrls: ["./authorization-dialog.component.scss"],
  standalone: false,
})
export class AuthorizationDialogComponent implements OnInit {
  @Input()
  authorizationCode: string;

  constructor(private bsModalRef: BsModalRef) {}

  ngOnInit(): void {}

  close(): void {
    this.bsModalRef.hide();
  }
}
