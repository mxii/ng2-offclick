import { Directive, Input, OnInit, ViewContainerRef, Injectable } from '@angular/core';

import { Subject } from 'rxjs';

export interface IdAndComponent {
   id: number;
   component: any;
}

@Injectable()
export class OffClickService {

   public DocumentClick = new Subject<boolean>();

   private directives: IdAndComponent[] = [];

   constructor() {
      this.clickCallback = this.clickCallback.bind(this);

      setTimeout(() => { document.addEventListener('mousedown', this.clickCallback); }, 0);
      setTimeout(() => { document.addEventListener('touchstart', this.clickCallback); }, 0);
   }

   private getObjectType(obj: any): string {
      return (!obj || typeof (obj) !== 'object') ? '' : obj.__proto__.constructor.name;
   }

   private clickCallback() {
      setTimeout(() => this.DocumentClick.next(true), 100); // need this timeout !! min. 100
   }

   public add(directiveId: number, component: any) {
      this.directives.push({ id: directiveId, component: component });
   }

   public remove(directiveId: number) {
      var index = this.directives.findIndex(d => d.id == directiveId);
      if (index > -1) {
         this.directives.splice(index, 1);
      }
   }

   public getOfType(comp: any): IdAndComponent[] {
      let compType = '';

      if (typeof (comp) === 'function') compType = comp.name;
      else if (typeof (comp) === 'string') compType = comp;
      else if (typeof (comp) === 'object') compType = this.getObjectType(comp);

      return this.directives.filter(d => this.getObjectType(d.component) === compType);
   }

   public getAll(): IdAndComponent[] {
      return this.directives;
   }

   public print() {
      this.directives.forEach(d => console.log(`${d.id}: comp: ${d.component} --> type: ${this.getObjectType(d.component)}`));
   }
}

@Directive({
   selector: '[offClick]',
   host: {
      '(mousedown)': 'onClick($event)',
      '(touchstart)': 'onClick($event)'
   }
})
export class OffClickDirective implements OnInit {

   private static ID: number = 0;

   private _id: number = OffClickDirective.ID++;
   private _component: any;

   @Input('offClick') private _offClickHandler: () => void;

   constructor(private _view: ViewContainerRef, private _offClickService: OffClickService) { }

   ngOnInit() {

      if (typeof (this._offClickHandler) !== 'function') return;

      // see here : https://github.com/angular/angular/issues/8277#issuecomment-216206046

      this._component = (<any>this._view)._element.parentView.context;
      if (this._component) {
         this._offClickHandler = this._offClickHandler.bind(this._component);
      }

      this._offClickService.add(this._id, this._component);

      this._offClickService.DocumentClick.subscribe(
         click => { this._offClickHandler(); }
      );
   }

   ngOnDestroy() {
      this._offClickService.remove(this._id);
   }

   private clickPrevent() {
      var otherComponents = this._offClickService.getAll().filter(oc => oc.id != this._id);
      otherComponents.forEach(oc => oc.component.clickedOutside());
   }

   private onClick($event: any) {
      setTimeout(() => this.clickPrevent(), 100); // need a delay! min. 100! otherwise that component closes and our x/y click-pos isnt present any more!

      // clicked inside of our directive.. stop click handling!
      $event.stopPropagation();
   }
}
