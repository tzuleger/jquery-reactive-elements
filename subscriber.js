//@ts-check

/** @typedef {(e: JQuery.TriggeredEvent?) => number|string} ReactiveFunction */
/**
 * Creates a subscription object that can subscribe to other JQuery elements to accomplish reactivity.
 * If that element changes (on("input change")), then the function provided to this object is fired and this element changes as well.
 * @template {ReactiveFunction} T Some reactive function.
 * @example
 * // Creating new element <input> that is subscribed to existing and future elements "#foo" and "#bar"
 * const sub = Subscriber.NewElementAsSubscriber((e) => 0, "input", "#foo", "#bar");
 * sub.subscribe((e) => 2, "#biz");
 * sub.subscribe((e) => 3, "#baz");
 * 
 * // Attach the newly created element to DOM
 * $(document).append(sub.element);
 * 
 * // example of reactivity
 * $(sub.selector()).val(49);
 * console.log($(sub.selector()).val()); // yields '49'
 * $("#foo").trigger("change");
 * console.log($(sub.selector()).val()); // yields '0'
 * $("#baz").trigger("change");
 * console.log($(sub.selector()).val()); // yields '3'
 * 
 * // example of unsubscribe()
 * sub.unsubscribe();
 * $("#bar").trigger("change");
 * console.log($(sub.selector()).val()); // yields '3'
 * sub.resubscribe(); // resubscribes to all past subscriptions
 * $("#bar").trigger("change");
 * console.log($(sub.selector()).val()); // yields '0'
 * $("#biz").trigger("change");
 * console.log($(sub.selector()).val()); // yields '2'
 * 
 * // example of clear()
 * sub.clear();
 * $("#baz").trigger("change");
 * console.log($(sub.selector()).val()); // yields '2'
 * sub.resubscribe(); // does nothing.
 * $("#baz").trigger("change");
 * console.log($(sub.selector()).val()); // yields '2'
 * sub.subscribe((e) => 3, "#baz"); // must explicitly redefine the subscription.
 * $("#baz").trigger("change");
 * console.log($(sub.selector()).val()); // yields '3'
 * sub.subscribe("#foo");
 * $("#foo").trigger("change"); // base reaction handling function created through constructor still remains.
 * console.log($(sub.selector()).val()); // yields '0'
 */
class Subscriber {
    /** @type {JQuery<HTMLElement>} JQuery HTMLElement that is provided (or created) through the constructor */
    element;
    /** @type {string} Randomly generated id assigned to JQuery HTMLElement (provided or created through constructor) */
    id;
    /** @type {T} */
    fire;
    /** @type {string[]} Element selectors that this subscription is subscribed to. */
    subscriptions = [];

    /**
     * Creates a subscriber for an existing element and subscribes to all of its provided selectors.
     * @template {(e?: JQuery.TriggeredEvent) => number|string} T Some type of function that takes in the nullable argument of JQuery.TriggeredEvent and returns a number or string.
     * @param {T} trigger Trigger function for when the subscriber sees changes on its subscriptions
     * @param {string} subscriberSelector CSS Selector of the existing element
     * @param {...string} subscribingSelectors CSS Selector of existing (or to be added) elements that the subscriber will listen for changes.
     * @example
     * const mySubscriber = Subscriber.CreateSubscriber(
     *      (e) => $("#foo").val() + $("#bar"), 
     *      "#my-reactive-element", 
     *      [() => "#foo", () => "#bar"]);
     * 
     * $("#foo").val(24);
     * $("#foo").trigger("change");
     * console.log($("#my-reactive-element").val()); // Assuming value of "#bar" is 0, yields "24"
     * $("#bar").val(14);
     * $("#bar").trigger("change");
     * console.log($("#my-reactive-element").val()); // yields "38"
     */
    static CreateSubscriber(trigger, subscriberSelector, ...subscribingSelectors) {
        const sub = new Subscriber($(subscriberSelector), trigger);
        sub.subscribe(...subscribingSelectors);
        return sub;
    }

    /**
     * Creates a subscriber and a new Element and subscribes to all of its provided selectors.
     * @template {(e?: JQuery.TriggeredEvent) => number|string} T Some type of function that takes in the nullable argument of JQuery.TriggeredEvent and returns a number or string.
     * @param {T} trigger Trigger function for when the subscriber sees changes on its subscriptions
     * @param {string} subscriberElementType Element type to be created for this subscriber
     * @param {...string} subscribingSelectors CSS Selector of existing (or to be added) elements that the subscriber will listen for changes.
     * @example
     * const mySubscriber = Subscriber.NewElementAsSubscriber(
     *      (e) => $("#foo").val() + $("#bar"), 
     *      "input", 
     *      [() => "#foo", () => "#bar"]);
     * 
     * $(document).append(mySubscriber.element);
     * $("#foo").val(24);
     * $("#foo").trigger("change");
     * console.log($(mySubscriber.selector()).val()); // Assuming value of "#bar" is 0, yields "24"
     * $("#bar").val(14);
     * $("#bar").trigger("change");
     * console.log($(mySubscriber.selector()).val()); // yields "38"
     */
    static NewElementAsSubscriber(trigger, subscriberElementType, ...subscribingSelectors) {
        const sub = new Subscriber(`<${subscriberElementType}></${subscriberElementType}>`, trigger);
        sub.subscribe(...subscribingSelectors);
        return sub;
    }

    /**
     * Creates a new Subscriber given the generic parameter T (the type of trigger function)
     * @param {JQuery<HTMLElement> | string} el JQuery HTML Element, JQuery CSS Selector, OR "<element></element>" type to create new.
     * @param {T} f Trigger function for handling reactivity.
     * @param {string} id Id of the element. (This parameter should be used if the Subscriber element does not exist yet.)
     */
    constructor(el, f=null, id=null) {
        if(typeof(el) === "string") {
            if(/<(.*)><\/(.*)>/.test(el)) {
                this.element = $(el);
                this.id = Math.random().toString(36).slice(2);
                this.element.attr("id", this.id);
            } else {
                this.element = $(el);
                this.id = $(el).attr("id");
                this.element.attr("id", this.id);
            }
        } else {
            this.element = el;
            this.id = id ?? /** @type {JQuery<HTMLElement>}*/(el).attr("id");
        }
        this.fire = f;
    }

    /**
     * Manually triggers "change" on all elements (specified by CSS selector in [subscriptions]) on this Subscriber.
     */
    trigger() {
        this.subscriptions.forEach(sub => $(sub).trigger("change"));
    }

    /**
     * Subscribes to the element(s) associated with the given selector.
     * @param {any?} f {T} Function to handle reactivity (takes precedence over function passed through construction) 
     * @param {...string} selectors CSS selector through JQuery elements to subscribe to.
     * @example
     * // Assume only one element of selector "#my-element" exists.
     * const sub = new Subscriber("#my-element", (e) => 0);
     * sub.subscribe((e) => 3, "#foo", "#bar");
     * sub.subscribe((e) => 6, "#biz");
     * sub.subscribe("#baz");
     * 
     * $("#my-element").val(12);
     * console.log($("#my-element").val()); // yields "12"
     * $("#foo").trigger("change");
     * console.log($("#my-element").val()); // yields "3"
     * $("#biz").trigger("change");
     * console.log($("#my-element").val()); // yields "6"
     * $("#baz").trigger("change");
     * console.log($("#my-element").val()); // yields "0"
     */
    subscribe(f=null, ...selectors) {
        console.log(f, selectors);
        const sub = (/** @type {string} */sel) =>  {
            $(document).on("input change", sel, (e) => {
                /** @type {number|string} */
                let val;
                if(typeof(f) !== "string") {
                    val = f(e);
                } else if(this.fire) {
                    val = this.fire(e);
                } else {
                    console.warn(`No function provided for trigger.`);
                }
                val = isNaN(/** @type {number} */ (val)) ? 0 : val;
                $(this.selector()).val(val);
                $(this.selector()).trigger("change");
            });
        }
        if(typeof(f) === "string") sub(f);
        for(let sel of selectors) {
            sub(sel);
        }
        this.subscriptions = [...this.subscriptions, ...selectors];
    }

    /**
     * Unsubscribes from all elements that this Subscriber subscribed to.
     */
    unsubscribe() {
        const unsub = (/** @type {string} */ sel) => {
            $(document).off("input change", sel);
        }
        for(let sel of this.subscriptions) {
            unsub(sel);
        }
    }

    /**
     * Resubscribes to all subscriptions that have previously been subscribed to.
     */
    resubscribe() {
        const selectors = [...this.subscriptions];
        this.clear();
        this.subscribe(selectors);
    }

    /**
     * Unsubscribes from all subscriptions and clears the subscriptions so this subscriber cannot resubscribe without explicitly redefining the subscriptions.
     */
    clear() {
        this.unsubscribe();
        this.subscriptions = [];
    }

    /**
     * Returns the selector of this element.
     */
    selector() {
        return `#${this.id}`;
    }
}
