// Tests for the Pig rules. Run them on a Mac with:
// swiftc PigGame.swift main.swift -o pigtests && ./pigtests
var failures = 0
func check(_ ok: Bool, _ what: String) {
    print(ok ? "PASS" : "FAIL", what)
    if !ok { failures += 1 }
}

var g = PigGame(target: 50)
_ = g.roll(4); _ = g.roll(6)
check(g.turnTotal == 10, "two rolls add up: 4 + 6 = 10")
check(g.hold() == .held(10) && g.score(of: .one) == 10, "hold banks 10 for player 1")
check(g.current == .two && g.turnTotal == 0, "hold passes the die and clears the turn")
_ = g.roll(5)
check(g.roll(1) == .pigOut && g.turnTotal == 0, "a 1 wipes the turn total")
check(g.current == .one && g.score(of: .two) == 0, "a 1 passes the die and banks nothing")
var w = PigGame(target: 20)
_ = w.roll(6); _ = w.roll(6); _ = w.roll(6); _ = w.roll(2)
check(w.hold() == .won(.one) && w.winner == .one, "reaching the target wins")
check(w.roll(3) == .won(.one) && w.turnTotal == 0, "no more rolls after a win")
check(!botWantsToRoll(turnTotal: 20, score: 0, target: 50), "bot holds at 20")
check(botWantsToRoll(turnTotal: 19, score: 0, target: 50), "bot rolls at 19")
check(!botWantsToRoll(turnTotal: 6, score: 45, target: 50), "bot holds when holding wins")

// Play 100,000 bot turns and average the points banked per turn.
var total = 0
let turns = 100_000
for _ in 0..<turns {
    var turn = PigGame(target: 1_000)
    while botWantsToRoll(turnTotal: turn.turnTotal, score: 0, target: 1_000) {
        if turn.roll() == .pigOut { break }
    }
    if turn.current == .one { total += turn.turnTotal }
}
print("Hold at 20: average", Double(total) / Double(turns), "points a turn over", turns, "turns")
print(failures == 0 ? "All tests passed." : "\(failures) failed.")
