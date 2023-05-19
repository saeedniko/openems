import { Directive, Inject, Input, OnChanges, OnDestroy } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ModalController } from "@ionic/angular";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ChannelAddress, Edge, Service, Websocket } from "src/app/shared/shared";
import { v4 as uuidv4 } from 'uuid';
import { UnitvaluePipe } from "../../pipe/unitvalue/unitvalue.pipe";

@Directive()
export abstract class AbstractFlatWidgetLine implements OnChanges, OnDestroy {

    /**
     * Use `converter` to convert/map a CurrentData value to another value, e.g. an Enum number to a text.
     * 
     * @param value the value from CurrentData
     * @returns converter function
     */
    @Input()
    public converter = (value: any): string => { return value; };

    /** value defines value of the parameter, displayed on the right */
    @Input()
    public value: any;

    /** Channel defines the channel, you need for this line */
    @Input()
    set channelAddress(channelAddress: string) {
        this.subscribe(ChannelAddress.fromString(channelAddress));
    }

    public ngOnChanges() {
        this.setValue(this.value);
    };

    /** 
     * displayValue is the displayed @Input value in html
     */
    public displayValue: string | null = null;

    /**
     * selector used for subscribe
     */
    private selector: string = uuidv4();
    private stopOnDestroy: Subject<void> = new Subject<void>();
    private edge: Edge = null;

    constructor(
        @Inject(Websocket) protected websocket: Websocket,
        @Inject(ActivatedRoute) protected route: ActivatedRoute,
        @Inject(Service) protected service: Service,
        @Inject(ModalController) protected modalCtrl: ModalController
    ) {
    }

    protected setValue(value: any) {
        this.displayValue = this.converter(value);
    }

    protected subscribe(channelAddress: ChannelAddress) {
        this.service.setCurrentComponent('', this.route).then(edge => {
            this.edge = edge;

            edge.subscribeChannels(this.websocket, this.selector, [channelAddress]);

            // call onCurrentData() with latest data
            edge.currentData.pipe(takeUntil(this.stopOnDestroy)).subscribe(currentData => {
                this.setValue(currentData.channel[channelAddress.toString()]);
            });
        });
    }

    public ngOnDestroy() {
        // Unsubscribe from OpenEMS
        if (this.edge != null) {
            this.edge.unsubscribeChannels(this.websocket, this.selector);
        }

        // Unsubscribe from CurrentData subject
        this.stopOnDestroy.next();
        this.stopOnDestroy.complete();
    }
}