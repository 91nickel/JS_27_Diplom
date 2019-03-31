'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error('Передан объект не Vector');
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
    times(time = 1) {
        return new Vector(this.x * time, this.y * time);
    }
}

class Actor {
    constructor(
        pos = new Vector(0, 0),
        size = new Vector(1, 1),
        speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector)) {
            throw new Error('Передан объект не Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('Передан объект не Vector');
        }
        if (!(speed instanceof Vector)) {
            throw new Error('Передан объект не Vector');
        }

        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }
    get type() {
        return 'actor';
    }

    get left() {
        if (this.pos.x < 0) {
            return 0;
        }
        return this.pos.x;
    }
    get top() {
        if (this.pos.y < 0) {
            return 0;
        }
        return this.pos.y;
    }
    get right() {
        if (this.pos.x + this.size.x <= 0) {
            return -this.pos.x;
        }
        return this.pos.x + this.size.x;
    }
    get bottom() {
        if (this.pos.y + this.size.y <= 0) {
            return -this.pos.y;
        }
        return this.pos.y + this.size.y;
    }
    get edges() {
        let edges = new Object();
        edges.left = this.left;
        edges.right = this.right;
        edges.top = this.top;
        edges.bottom = this.bottom;

        edges.left = edges.left > this.right ? this.right : edges.left;
        edges.right = edges.right < this.right ? this.left : edges.right;
        edges.top = edges.top > this.bottom ? this.bottom : edges.top;
        edges.bottom = edges.bottom < this.bottom ? this.top : edges.bottom;

        return edges;
    }

    act() {

    }
    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Передан объект не Actor');
        }
        if (this === actor) {
            return false;
        }
        if (this.edges.left >= actor.edges.right ||
            this.edges.right <= actor.edges.left ||
            this.edges.top >= actor.edges.bottom ||
            this.edges.bottom <= actor.edges.top) {
            return false;
        }
        return true;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        this.grid = grid;
        this.actors = actors;
        this.status = null;
        this.finishDelay = 1;
        this.player = actors.find(actor => actor.type === 'player');
        this.height = grid.length;
        this.width = grid.reduce(((max, arr) => (arr.length > max) ? arr.length : max), 0);
    }
    //Возвращает true, если свойство status не равно null и finishDelay меньше нуля.
    isFinished() {
        return this.status !== null && this.finishDelay < 0;
    }
    /*
    Определяет, расположен ли какой-то другой движущийся объект в переданной позиции, и если да, вернёт этот объект.
    Принимает один аргумент — движущийся объект, Actor. Если не передать аргумент или передать не объект Actor, метод должен бросить исключение.
    Возвращает undefined, если переданный движущийся объект не пересекается ни с одним объектом на игровом поле.
    Возвращает объект Actor, если переданный объект пересекается с ним на игровом поле. Если пересекается с несколькими объектами, вернет первый.
    */
    actorAt(actor) {
        if (!actor || !actor instanceof Actor) {
            throw new Error('Передан объект не Actor');
        }
        return this.actors.find(item => item instanceof Actor && item.isIntersect(actor));
    }
    /*
    Аналогично методу actorAt определяет, нет ли препятствия в указанном месте. Также этот метод контролирует выход объекта за границы игрового поля.
    Так как движущиеся объекты не могут двигаться сквозь стены, то метод принимает два аргумента: положение, куда собираемся передвинуть объект, вектор Vector, и размер этого объекта, тоже вектор Vector. 
    Если первым и вторым аргументом передать не Vector, то метод бросает исключение.
    Вернет строку, соответствующую препятствию из сетки игрового поля, пересекающему область, описанную двумя переданными векторами, либо undefined, если в этой области препятствий нет.
    Если описанная двумя векторами область выходит за пределы игрового поля, то метод вернет строку lava, если область выступает снизу. И вернет wall в остальных случаях. 
    Будем считать, что игровое поле слева, сверху и справа огорожено стеной и снизу у него смертельная лава.
    */
    obstacleAt(pos, size) {
        if (!pos || !pos instanceof Vector || !size || !size instanceof Vector) {
            throw new Error('Передан объект не Vector');
        }

        return this.grid[pos.x][pos.y];
    }
    /*
    Метод удаляет переданный объект с игрового поля. Если такого объекта на игровом поле нет, не делает ничего.
    Принимает один аргумент, объект Actor. Находит и удаляет его.
    */
    removeActor(actor) {
        for (let key in this.actors) {
            if (actor === this.actors[key]) {
                this.actors.splice(key, 1);
            }
        }
    }
    /*
    Определяет, остались ли еще объекты переданного типа на игровом поле. Принимает один аргумент — тип движущегося объекта, строка. Возвращает true, если на игровом поле нет объектов этого типа (свойство type). Иначе возвращает false.
    */
    noMoreActors(type) {
        let res = this.actors.find(function (el) {
            return el.type === type;
        });
        return true;
    }
    /*
    Один из ключевых методов, определяющий логику игры. Меняет состояние игрового поля при касании игроком каких-либо объектов или препятствий.
    Если состояние игры уже отлично от null, то не делаем ничего, игра уже и так завершилась.
    Принимает два аргумента. Тип препятствия или объекта, строка. Движущийся объект, которого коснулся игрок, — объект типа Actor, необязательный аргумент.
    Если первым аргументом передать строку lava или fireball, то меняем статус игры на lost (свойство status). Игрок проигрывает при касании лавы или шаровой молнии.
    Если первым аргументом передать строку coin, а вторым — объект монеты, то необходимо удалить эту монету с игрового поля. Если при этом на игровом поле не осталось больше монет, то меняем статус игры на won. Игрок побеждает, когда собирает все монеты на уровне. Отсюда вытекает факт, что уровень без монет пройти невозможно.
    */
    playerTouched(type, actor) {
        if (type === 'lava' || type === 'fireball') {
            this.status = 'lost';
        }
        if (type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors(type)) {
                this.status = 'won';
            }

        }
    }
}