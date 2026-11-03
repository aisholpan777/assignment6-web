
$(function () {
    const original = [
        {
            id: 'balcony',
            name: 'Balcony',
            floor: 2,
            guests: [
                ['Aigerim', 'green', '20:45', 1, 'cup crumbs'],
                ['Aliya', 'black', '21:15', 0, 'phone cup'],
                ['Madina', 'green', '22:10', 0, 'phone bag crumbs'],
                ['Ivan', 'black', '20:10', 1, 'cup']
            ]
        },
        {
            id: 'hall',
            name: 'Hall',
            floor: 2,
            guests: [
                ['Arman', 'yellow', '20:35', 0, 'bag glasses'],
                ['Sophia', 'purple', '21:20', 1, 'phone'],
                ['Dias', 'green', '19:45', 1, ''],
                ['Bekzat', 'purple', '20:55', 0, 'bag cup crumbs'],
                ['Aruzhan', 'blue', '21:50', 1, 'phone'],
                ['Saule', 'green', '21:25', 0, 'glasses']
            ]
        },
        {
            id: 'kitchen',
            name: 'Kitchen',
            floor: 1,
            guests: [
                ['Nurlan', 'red', '19:40', 1, 'phone cup'],
                ['Emma', 'black', '20:15', 0, 'bag'],
                ['Timur', 'green', '21:05', 1, 'phone bag crumbs'],
                ['Sergey', 'yellow', '20:50', 0, ''],
                ['Yerlan', 'red', '21:40', 1, 'glasses phone'],
                ['Kamila', 'green', '20:05', 0, 'cup']
            ]
        },
        {
            id: 'living',
            name: 'Living room',
            floor: 1,
            guests: [
                ['Daniel', 'blue', '19:55', 1, 'glasses'],
                ['Zarina', 'green', '21:10', 0, 'bag phone crumbs'],
                ['Natasha', 'yellow', '20:30', 1, ''],
                ['Askar', 'black', '21:00', 1, 'phone'],
                ['Inkar', 'purple', '20:20', 0, 'bag']
            ]
        }
    ];

    const colors = {
        red: '#dc4754',
        blue: '#3974d8',
        green: '#278d64',
        black: '#29323b',
        yellow: '#e8a41d',
        purple: '#9453ce'
    };

    const icons = {
        phone: '📱',
        glasses: '👓',
        bag: '👜',
        cup: '☕',
        crumbs: '🍰'
    };

    const labels = {
        phone: 'a phone',
        glasses: 'glasses',
        bag: 'a bag',
        cup: 'a cup',
        crumbs: 'cake crumbs'
    };

    const questions = [
        'Who is in the hall?',
        'Who is dressed in yellow or purple?',
        'Which AITU students are upstairs?',
        'Who has glasses or a bag?',
        'Who came with nothing at all?',
        'Who has a phone but no bag?',
        'Who arrived between 20:30 and 21:00?',
        'Who arrived after 21:00 and is not an AITU student?',
        'Who stands right next to Askar?',
        'Who stands last in each room?',
        'Who stands third in each room?',
        'Who stands after Timur in his room?',
        'Who stands right before someone in black?',
        'In which room is Aruzhan?',
        'Which rooms have fewer than 6 guests?',
        'Which rooms have a cup but no glasses?',
        'Who came first to each room?',
        'Miras joins between Askar and Inkar',
        'Natasha goes home',
        'Who took the cake?'
    ];

    let rooms = [];
    let sortState = {};
    let modalGuest = null;
    let modalToken = 0;
    let partyVersion = 0;
    let moveBusy = false;
    let currentCase = null;
    let sortAnimations = {};

    function minutes(time) {
        const [hours, mins] = time.split(':').map(Number);
        return hours * 60 + mins;
    }

    function fresh() {
        return original.map(room => ({
            ...room,
            guests: room.guests.map((item, index) => ({
                name: item[0],
                color: item[1],
                time: item[2],
                student: Boolean(item[3]),
                things: item[4] ? item[4].split(' ') : [],
                order: index
            }))
        }));
    }

    function findData(name) {
        for (const room of rooms) {
            const guest = room.guests.find(item => item.name === name);

            if (guest) {
                return { guest, room };
            }
        }

        return null;
    }

    function avatar(name) {
        return 'https://api.dicebear.com/9.x/open-peeps/svg?seed=' +
            encodeURIComponent(name);
    }

    function makeCard(guest) {
        const $card = $('<article class="guest" tabindex="0">')
            .addClass('color-' + guest.color)
            .toggleClass('aitu', guest.student)
            .attr({
                'data-name': guest.name,
                'data-color': guest.color,
                'data-time': guest.time,
                'data-minutes': minutes(guest.time),
                'data-student': String(guest.student),
                'data-things': guest.things.join(' ')
            })
            .css('--ring', colors[guest.color]);

        $('<img class="avatar" alt="">')
            .attr('src', avatar(guest.name))
            .appendTo($card);

        if (guest.student) {
            $('<span class="student-badge">🎓</span>')
                .appendTo($card);
        }

        $('<div class="name">')
            .text(guest.name)
            .appendTo($card);

        $('<div class="time">')
            .text('◷ ' + guest.time)
            .appendTo($card);

        $('<div class="things">')
            .text(guest.things.map(thing => icons[thing]).join(' '))
            .appendTo($card);

        return $card;
    }

    function finishSortAnimations() {
        Object.keys(sortAnimations).forEach(id => {
            const animation = sortAnimations[id];

            if (!animation) return;

            animation.ghosts.forEach($ghost => {
                $ghost.stop(true, false).remove();
            });

            animation.cards.forEach($card => {
                $card.css('visibility', '');
            });
        });

        sortAnimations = {};

        $('.sort-flight').stop(true, false).remove();

        $('.guest').css('visibility', '');
    }

    function stopAnimations() {
        finishSortAnimations();

        $('.guest').each(function () {
            $(this)
                .stop('jump', true, false)
                .stop(true, false)
                .css({
                    top: 0,
                    left: 0,
                    opacity: 1
                });
        });

        $('.flight, .placeholder')
            .stop(true, false)
            .remove();

        moveBusy = false;
    }

    function render() {
        partyVersion++;

        stopAnimations();

        rooms.forEach(room => {
            const $list = $('#' + room.id + ' .guests').empty();

            room.guests.forEach(guest => {
                $list.append(makeCard(guest));
            });
        });

        $('.sort').each(function () {
            const id = $(this).closest('.room').attr('id');

            $(this).text(
                sortState[id] ? 'Original order' : 'Sort by time'
            );
        });
    }

    function clearSpot() {
        currentCase = null;

        $('.guest').each(function () {
            $(this)
                .stop('jump', true, false)
                .stop(true, false)
                .css('top', 0)
                .animate({ opacity: 1 }, 300)
                .removeClass('selected');
        });

        $('.room').removeClass('selected');
    }

    function reset() {
        closeModal(true);

        rooms = fresh();
        sortState = {};

        render();
        clearSpot();

        $('#result').text('Original party restored.');
    }

    function jump($guests) {
        $guests.each(function () {
            const $guest = $(this);

            $guest
                .stop('jump', true, false)
                .stop(true, false)
                .css('top', 0);

            $guest.animate(
                { top: -13 },
                {
                    duration: 140,
                    queue: 'jump',
                    complete: function () {
                        $guest.animate(
                            { top: 0 },
                            {
                                duration: 180,
                                queue: 'jump'
                            }
                        );
                    }
                }
            );

            $guest.dequeue('jump');
        });
    }

    function caseQuery(number) {
        switch (number) {
            case 1:
                return $('#hall .guest');

            case 2:
                return $('.guest.color-yellow, .guest.color-purple');

            case 3:
                return $('.room[data-floor="2"] .guest.aitu');

            case 4:
                return $('.guest[data-things~="glasses"], .guest[data-things~="bag"]');

            case 5:
                return $('.guest[data-things=""]');

            case 6:
                return $('.guest[data-things~="phone"]')
                    .not('[data-things~="bag"]');

            case 7:
                return $('.guest').filter(function () {
                    const time = +$(this).attr('data-minutes');
                    return time >= 1230 && time <= 1260;
                });

            case 8:
                return $('.guest:not(.aitu)').filter(function () {
                    return +$(this).attr('data-minutes') > 1260;
                });

            case 9:
                return $('.guest[data-name="Askar"]')
                    .prev('.guest')
                    .add(
                        $('.guest[data-name="Askar"]').next('.guest')
                    );

            case 10:
                return $('.room .guests .guest:last-child');

            case 11:
                return $('.room .guests .guest:nth-child(3)');

            case 12:
                return $('.guest[data-name="Timur"]')
                    .nextAll('.guest');

            case 13:
                return $('.guest.color-black').prev('.guest');

            case 14:
                return $('.room:has(.guest[data-name="Aruzhan"])');

            case 15:
                return $('.room').filter(function () {
                    return $(this).find('.guest').length < 6;
                });

            case 16:
                return $('.room:has(.guest[data-things~="cup"])')
                    .not(':has(.guest[data-things~="glasses"])');

            case 17:
                return $('.room').map(function () {
                    return $(this)
                        .find('.guest')
                        .toArray()
                        .sort((a, b) => {
                            return +$(a).attr('data-minutes') -
                                +$(b).attr('data-minutes');
                        })[0];
                });

            case 20:
                return $('.room[data-floor="1"] .guest[data-things~="crumbs"]')
                    .not('[data-things~="cup"]')
                    .filter(function () {
                        const time = +$(this).attr('data-minutes');

                        const nextToStudent =
                            $(this).prev('.aitu').length > 0 ||
                            $(this).next('.aitu').length > 0;

                        return time > 1260 &&
                            time < 1290 &&
                            nextToStudent;
                    });

            default:
                return $();
        }
    }

    function spotlight($found) {
        $('.guest')
            .stop(true, false)
            .animate({ opacity: 0.2 }, 300)
            .removeClass('selected');

        const $bright = $found
            .filter('.guest')
            .add($found.filter('.room').find('.guest'));

        $bright
            .stop(true, false)
            .animate({ opacity: 1 }, 300)
            .addClass('selected');

        jump($bright);
    }

    function showResult(number, $found) {
        const isRoom = $found.first().hasClass('room');

        const names = $found.map(function () {
            return isRoom
                ? $(this).attr('data-room')
                : $(this).attr('data-name');
        }).get();

        $('#result').text(
            'Case ' + number +
            ' — ' + names.length +
            ' found: ' +
            (names.join(', ') || 'none') +
            (number === 20 ? ' — Cake thief!' : '')
        );
    }

    function runCase(number) {
        if (moveBusy) return;

        closeModal(true);
        clearSpot();

        currentCase = number;

        if (number === 18 || number === 19) {
            rooms = fresh();
            sortState = {};

            render();

            const version = partyVersion;

            if (number === 18) {
                const room = rooms.find(item => item.id === 'living');

                const guest = {
                    name: 'Miras',
                    color: 'blue',
                    time: '21:20',
                    student: true,
                    things: ['phone'],
                    order: 3.5
                };

                const index = room.guests.findIndex(
                    item => item.name === 'Inkar'
                );

                room.guests.splice(index, 0, guest);

                const $card = makeCard(guest)
                    .hide()
                    .insertAfter(
                        $('.guest[data-name="Askar"]')
                    );

                $card.fadeIn(500, function () {
                    if (version !== partyVersion) return;

                    spotlight($card);

                    $('#result').text(
                        'Case 18 — Miras joined between Askar and Inkar.'
                    );
                });
            } else {
                $('.guest[data-name="Natasha"]')
                    .fadeOut(500, function () {
                        if (version !== partyVersion) return;

                        $(this).remove();

                        const room = rooms.find(
                            item => item.id === 'living'
                        );

                        room.guests = room.guests.filter(
                            guest => guest.name !== 'Natasha'
                        );

                        $('#result').text(
                            'Case 19 — Natasha went home.'
                        );
                    });
            }

            return;
        }

        render();

        const $found = caseQuery(number);

        spotlight($found);
        showResult(number, $found);
    }

    function guestAvatarRect(name) {
        const $avatar = $('.guest').filter(function () {
            return $(this).attr('data-name') === name;
        }).find('.avatar');

        if (!$avatar.length) return null;

        const rect = $avatar[0].getBoundingClientRect();

        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    function hideModal() {
        $('#detail').stop(true, false).removeAttr('style');

        $('#overlay')
            .hide()
            .removeClass('is-open')
            .attr('aria-hidden', 'true');

        modalGuest = null;
    }

    function closeModal(immediate = false, done = null) {
        modalToken++;

        const token = modalToken;
        const name = modalGuest;
        const $box = $('#detail');

        $box.stop(true, false);

        if (immediate || !name) {
            hideModal();

            if (done) done();
            return;
        }

        const target = guestAvatarRect(name);

        if (!target) {
            hideModal();

            if (done) done();
            return;
        }

        modalGuest = null;

        const current = $box[0].getBoundingClientRect();

        $box.css({
            position: 'fixed',
            left: current.left,
            top: current.top,
            width: current.width,
            height: current.height,
            maxHeight: 'none',
            overflow: 'hidden',
            opacity: 1
        });

        $box.animate({
            left: target.left,
            top: target.top,
            width: target.width,
            height: target.height,
            opacity: 0
        }, {
            duration: 350,
            queue: false,
            complete: function () {
                if (token !== modalToken) return;

                hideModal();

                if (done) done();
            }
        });
    }

    function openModal(name) {
        const found = findData(name);

        if (!found || moveBusy) return;

        if (modalGuest && modalGuest !== name) {
            closeModal(false, function () {
                openModal(name);
            });
            return;
        }

        closeModal(true);

        const start = guestAvatarRect(name);

        if (!start) return;

        const token = ++modalToken;

        modalGuest = name;

        const { guest, room } = found;
        const $box = $('#detail');
        const $overlay = $('#overlay');

        $('#detail-body').empty().append(
            $('<img alt="Guest avatar">')
                .attr('src', avatar(name))
                .css('--ring', colors[guest.color]),

            $('<h2>').text(name),

            $('<p>').text(
                'Room: ' + room.name +
                ' (floor ' + room.floor + ')'
            ),

            $('<p>').text('Clothing: ' + guest.color),

            $('<p>').text('Came at ' + guest.time),

            $('<p>').text(
                guest.student
                    ? 'AITU student'
                    : 'Not an AITU student'
            ),

            $('<p>').text(
                guest.things.length
                    ? 'Has ' + guest.things.map(
                        thing => labels[thing]
                    ).join(', ')
                    : 'Came with nothing'
            )
        );

        $('#moves').empty();

        rooms
            .filter(item => item.id !== room.id)
            .forEach(item => {
                $('<button type="button">')
                    .text('Move to ' + item.name)
                    .on('click', function () {
                        moveGuest(name, item.id);
                    })
                    .appendTo('#moves');
            });

        $overlay
            .show()
            .addClass('is-open')
            .attr('aria-hidden', 'false');

        const width = Math.min(420, window.innerWidth - 32);

        $box.stop(true, false).css({
            position: 'fixed',
            left: 0,
            top: 0,
            width,
            height: 'auto',
            maxHeight: 'none',
            overflow: 'visible',
            opacity: 0,
            visibility: 'hidden'
        });

        const naturalHeight = $box.outerHeight();

        const height = Math.min(
            naturalHeight,
            window.innerHeight - 32
        );

        const targetLeft = (window.innerWidth - width) / 2;
        const targetTop = (window.innerHeight - height) / 2;

        $box.css({
            left: start.left,
            top: start.top,
            width: start.width,
            height: start.height,
            overflow: 'hidden',
            visibility: 'visible',
            opacity: 0.25
        });

        $box.animate({
            left: targetLeft,
            top: targetTop,
            width,
            height,
            opacity: 1
        }, {
            duration: 400,
            queue: false,
            complete: function () {
                if (token !== modalToken) return;

                $box.css({
                    height: 'auto',
                    maxHeight: 'calc(100dvh - 32px)',
                    overflowY: 'auto',
                    overflowX: 'hidden'
                });
            }
        });
    }

    function moveGuest(name, targetId) {
        if (moveBusy) return;

        const source = findData(name);
        const destinationRoom = rooms.find(
            room => room.id === targetId
        );

        if (!source || !destinationRoom) return;
        if (source.room.id === targetId) return;

        moveBusy = true;

        closeModal(true);
        finishSortAnimations();

        const $card = $('.guest').filter(function () {
            return $(this).attr('data-name') === name;
        });

        const start = $card[0].getBoundingClientRect();

        const $ghost = $card.clone()
            .removeClass('selected')
            .addClass('flight')
            .css({
                position: 'fixed',
                left: start.left,
                top: start.top,
                width: start.width,
                height: start.height,
                margin: 0,
                opacity: 1,
                pointerEvents: 'none'
            })
            .appendTo('body');

        const $oldPlace = $('<div class="placeholder">')
            .css({
                flex: '0 0 ' + start.width + 'px',
                width: start.width,
                height: start.height
            })
            .insertBefore($card);

        $card.remove();

        source.room.guests = source.room.guests.filter(
            guest => guest.name !== name
        );

        source.guest.order = destinationRoom.guests.length;

        destinationRoom.guests.push(source.guest);

        sortState[source.room.id] = false;
        sortState[targetId] = false;

        const $destinationList = $('#' + targetId + ' .guests');

        const $newPlace = $('<div class="placeholder">')
            .css({
                flex: '0 0 0px',
                width: 0,
                height: start.height
            })
            .appendTo($destinationList);

        const destination = $newPlace[0].getBoundingClientRect();

        const targetLeft = destination.left;
        const targetTop = destination.top;

        $oldPlace.animate({
            width: 0,
            opacity: 0
        }, {
            duration: 520,
            step: function (value, fx) {
                if (fx.prop === 'width') {
                    $(this).css('flex-basis', value + 'px');
                }
            },
            complete: function () {
                $oldPlace.remove();
            }
        });

        $newPlace.animate({
            width: start.width
        }, {
            duration: 520,
            step: function (value, fx) {
                if (fx.prop === 'width') {
                    $(this).css('flex-basis', value + 'px');
                }
            }
        });

        const version = partyVersion;

        $ghost.animate({
            left: targetLeft,
            top: targetTop
        }, {
            duration: 520,
            queue: false,
            complete: function () {
                if (version !== partyVersion) return;

                $ghost.remove();

                $newPlace.replaceWith(
                    makeCard(source.guest)
                );

                $oldPlace.remove();

                moveBusy = false;

                $('#' + source.room.id + ' .sort')
                    .text('Sort by time');

                $('#' + targetId + ' .sort')
                    .text('Sort by time');

                $('#result').text(
                    name + ' moved to ' +
                    destinationRoom.name + '.'
                );
            }
        });
    }

    function sortRoom(id) {
        if (moveBusy) return;

        const room = rooms.find(item => item.id === id);

        if (!room) return;

        const $list = $('#' + id + ' .guests');
        const previousAnimation = sortAnimations[id];
        const visualPositions = {};

        if (previousAnimation) {
            previousAnimation.ghosts.forEach($ghost => {
                const name = $ghost.attr('data-name');

                if ($ghost.length && $ghost[0].isConnected) {
                    const rect = $ghost[0].getBoundingClientRect();

                    visualPositions[name] = {
                        left: rect.left,
                        top: rect.top,
                        width: rect.width,
                        height: rect.height
                    };
                }

                $ghost.stop(true, false).remove();
            });

            previousAnimation.cards.forEach($card => {
                $card.css('visibility', '');
            });

            delete sortAnimations[id];
        }

        const $cards = $list.children('.guest');

        $cards.each(function () {
            const $card = $(this);
            const name = $card.attr('data-name');

            if (!visualPositions[name]) {
                const rect = this.getBoundingClientRect();

                visualPositions[name] = {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                };
            }
        });

        sortState[id] = !sortState[id];

        room.guests.sort(
            sortState[id]
                ? (a, b) => minutes(a.time) - minutes(b.time)
                : (a, b) => a.order - b.order
        );

        const ordered = room.guests.map(guest => {
            return $cards.filter(function () {
                return $(this).attr('data-name') === guest.name;
            })[0];
        });

        $list.append(ordered);

        const animation = {
            ghosts: [],
            cards: [],
            remaining: ordered.length
        };

        sortAnimations[id] = animation;

        ordered.forEach(element => {
            if (!element) {
                animation.remaining--;
                return;
            }

            const $card = $(element);
            const name = $card.attr('data-name');
            const old = visualPositions[name];
            const target = element.getBoundingClientRect();

            if (!old) {
                animation.remaining--;
                return;
            }

            const $ghost = $card.clone()
                .removeClass('selected')
                .addClass('sort-flight')
                .css({
                    position: 'fixed',
                    left: old.left,
                    top: old.top,
                    width: old.width,
                    height: old.height,
                    margin: 0,
                    flex: 'none',
                    opacity: 1,
                    pointerEvents: 'none'
                })
                .appendTo('body');

            animation.ghosts.push($ghost);
            animation.cards.push($card);

            $card.css('visibility', 'hidden');

            $ghost.animate({
                left: target.left,
                top: target.top,
                width: target.width,
                height: target.height
            }, {
                duration: 450,
                queue: false,
                complete: function () {
                    $ghost.remove();
                    $card.css('visibility', '');

                    animation.remaining--;

                    if (
                        animation.remaining === 0 &&
                        sortAnimations[id] === animation
                    ) {
                        delete sortAnimations[id];
                    }
                }
            });
        });

        $('#' + id + ' .sort').text(
            sortState[id]
                ? 'Original order'
                : 'Sort by time'
        );

        $('#result').text(
            room.name +
            (sortState[id]
                ? ' sorted by arrival time.'
                : ' restored to picture order.')
        );
    }

    questions.forEach((question, index) => {
        $('#case').append(
            $('<option>')
                .val(index + 1)
                .text(
                    'Case ' + (index + 1) +
                    ': ' + question
                )
        );
    });

    $('#run').on('click', function () {
        runCase(Number($('#case').val()));
    });

    $('#clear').on('click', function () {
        clearSpot();
        $('#result').text('Spotlight cleared.');
    });

    $('#reset').on('click', reset);

    $(document)
        .on('click', '.guest', function () {
            openModal($(this).attr('data-name'));
        })
        .on('keydown', '.guest', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openModal($(this).attr('data-name'));
            }
        })
        .on('click', '.sort', function () {
            const id = $(this)
                .closest('.room')
                .attr('id');

            sortRoom(id);
        })
        .on('keydown', function (event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });

    $('#close').on('click', function () {
        closeModal();
    });

    $('#overlay').on('click', function (event) {
        if (event.target === this) {
            closeModal();
        }
    });

    reset();
});
